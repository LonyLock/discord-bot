'use strict';

const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder,
} = require('discord.js');
const { db, getGuildConfig } = require('../database/db');
const config = require('../../config.json');

/**
 * Build a plain-text transcript of a ticket channel (oldest → newest),
 * paging back through up to ~1000 messages.
 */
async function buildTranscript(channel, ticket) {
  const collected = [];
  let before;
  for (let i = 0; i < 10; i++) {
    const batch = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
    if (!batch || batch.size === 0) break;
    collected.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }
  collected.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const header = [
    `Ticket #${ticket.number}`,
    `Server: ${channel.guild.name} (${channel.guild.id})`,
    `Opened by: ${ticket.user_id}`,
    `Subject: ${ticket.subject || 'N/A'}`,
    `Messages: ${collected.length}`,
    '='.repeat(50),
    '',
  ].join('\n');

  const lines = collected.map((m) => {
    const time = new Date(m.createdTimestamp).toISOString().replace('T', ' ').slice(0, 19);
    const author = m.author ? `${m.author.tag}` : 'Unknown';
    let content = m.content || '';
    if (m.attachments.size) content += ` [attachments: ${[...m.attachments.values()].map((a) => a.url).join(', ')}]`;
    if (m.embeds.length && !content) content = '[embed]';
    return `[${time}] ${author}: ${content}`;
  });

  return header + lines.join('\n');
}

const insertTicket = db.prepare(`
  INSERT INTO tickets (channel_id, guild_id, user_id, subject, status, created_at, number)
  VALUES (?, ?, ?, ?, 'open', ?, ?)
`);
const getTicket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?');
const getUserOpenTickets = db.prepare(
  "SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = 'open'"
);
const closeTicketRow = db.prepare("UPDATE tickets SET status = 'closed' WHERE channel_id = ?");
const bumpCounter = db.prepare(`
  INSERT INTO ticket_counter (guild_id, counter) VALUES (?, 1)
  ON CONFLICT(guild_id) DO UPDATE SET counter = counter + 1
`);
const readCounter = db.prepare('SELECT counter FROM ticket_counter WHERE guild_id = ?');

/** Build the embed + button used on a ticket "panel" message. */
function panelComponents() {
  const embed = new EmbedBuilder()
    .setColor(config.brand.color)
    .setTitle('🎫 Support Tickets')
    .setDescription(
      'Need help? Click the button below to open a private ticket with the staff team.'
    )
    .setFooter({ text: config.brand.footer });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_open')
      .setLabel('Open a Ticket')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Primary)
  );
  return { embeds: [embed], components: [row] };
}

/** Create a ticket channel for a user. Returns { channel } or { error }. */
async function createTicket(guild, user, subject = 'No subject provided') {
  const cfg = getGuildConfig(guild.id);

  const existing = getUserOpenTickets.all(guild.id, user.id);
  if (existing.length >= 3) {
    return { error: 'You already have 3 open tickets. Please close one first.' };
  }

  bumpCounter.run(guild.id);
  const number = readCounter.get(guild.id).counter;

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];
  if (cfg.ticket_support_role && guild.roles.cache.has(cfg.ticket_support_role)) {
    overwrites.push({
      id: cfg.ticket_support_role,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  let channel;
  try {
    channel = await guild.channels.create({
      name: `ticket-${String(number).padStart(4, '0')}`,
      type: ChannelType.GuildText,
      parent: cfg.ticket_category && guild.channels.cache.has(cfg.ticket_category)
        ? cfg.ticket_category
        : null,
      permissionOverwrites: overwrites,
      topic: `Ticket #${number} • Opened by ${user.tag} (${user.id})`,
    });
  } catch (err) {
    return { error: `I could not create the ticket channel: ${err.message}` };
  }

  insertTicket.run(channel.id, guild.id, user.id, subject, Date.now(), number);

  const embed = new EmbedBuilder()
    .setColor(config.brand.color)
    .setTitle(`Ticket #${number}`)
    .setDescription(
      `Welcome ${user}! Staff will be with you shortly.\n\n**Subject:** ${subject}\n\nUse the buttons below to manage this ticket.`
    )
    .setFooter({ text: config.brand.footer })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Secondary).setEmoji('🙋')
  );

  const mention = cfg.ticket_support_role ? `<@&${cfg.ticket_support_role}> ` : '';
  await channel.send({ content: `${mention}${user}`, embeds: [embed], components: [row] });
  return { channel, number };
}

/** Close (archive + delete after delay) a ticket channel. */
async function closeTicket(channel, closedBy) {
  const ticket = getTicket.get(channel.id);
  if (!ticket) return { error: 'This is not a ticket channel.' };
  if (ticket.status === 'closed') return { error: 'This ticket is already closed.' };

  closeTicketRow.run(channel.id);

  // Generate a transcript before the channel is deleted.
  let transcript = null;
  try {
    transcript = await buildTranscript(channel, ticket);
  } catch { /* transcript is best-effort */ }
  const fileName = `transcript-ticket-${ticket.number}.txt`;

  const cfg = getGuildConfig(channel.guild.id);
  if (cfg.ticket_log_channel) {
    const logChannel = channel.guild.channels.cache.get(cfg.ticket_log_channel);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor(config.brand.warnColor)
        .setTitle(`Ticket #${ticket.number} Closed`)
        .addFields(
          { name: 'Opened by', value: `<@${ticket.user_id}>`, inline: true },
          { name: 'Closed by', value: `${closedBy}`, inline: true },
          { name: 'Subject', value: ticket.subject || 'N/A', inline: false }
        )
        .setFooter({ text: config.brand.footer })
        .setTimestamp();
      const files = transcript ? [new AttachmentBuilder(Buffer.from(transcript, 'utf8'), { name: fileName })] : [];
      logChannel.send({ embeds: [embed], files, allowedMentions: { parse: [] } }).catch(() => {});
    }
  }

  // DM the opener a copy of the transcript.
  if (transcript) {
    const opener = await channel.client.users.fetch(ticket.user_id).catch(() => null);
    if (opener) {
      opener.send({
        content: `Here is the transcript of your ticket **#${ticket.number}** from **${channel.guild.name}**.`,
        files: [new AttachmentBuilder(Buffer.from(transcript, 'utf8'), { name: fileName })],
      }).catch(() => {});
    }
  }

  await channel
    .send({ content: 'This ticket is now closed and will be deleted in 5 seconds…' })
    .catch(() => {});
  setTimeout(() => channel.delete().catch(() => {}), 5000);
  return { ok: true, ticket };
}

module.exports = { panelComponents, createTicket, closeTicket, getTicket };
