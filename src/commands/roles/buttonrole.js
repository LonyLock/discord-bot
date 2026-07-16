'use strict';

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ButtonStyle,
} = require('discord.js');
const { buildRows, q } = require('../../services/buttonroles');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');

const STYLES = {
  blurple: ButtonStyle.Primary,
  grey: ButtonStyle.Secondary,
  green: ButtonStyle.Success,
  red: ButtonStyle.Danger,
};

function parseEmoji(input) {
  if (!input) return null;
  const custom = input.match(/<a?:\w+:(\d+)>/);
  return custom ? custom[1] : input.trim();
}

module.exports = {
  category: 'roles',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageRoles],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  data: new SlashCommandBuilder()
    .setName('buttonrole')
    .setDescription('Self-assignable roles via buttons (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) => s.setName('create').setDescription('Post a new button-role message with its first button')
      .addRoleOption((o) => o.setName('role').setDescription('Role the button grants').setRequired(true))
      .addStringOption((o) => o.setName('label').setDescription('Button label').setRequired(true).setMaxLength(80))
      .addStringOption((o) => o.setName('title').setDescription('Embed title'))
      .addStringOption((o) => o.setName('description').setDescription('Embed description'))
      .addStringOption((o) => o.setName('emoji').setDescription('Button emoji'))
      .addStringOption((o) => o.setName('color').setDescription('Button color')
        .addChoices({ name: 'Blurple', value: 'blurple' }, { name: 'Grey', value: 'grey' }, { name: 'Green', value: 'green' }, { name: 'Red', value: 'red' })))
    .addSubcommand((s) => s.setName('add').setDescription('Add a button to an existing button-role message')
      .addStringOption((o) => o.setName('message_id').setDescription('Target message ID (in this channel)').setRequired(true))
      .addRoleOption((o) => o.setName('role').setDescription('Role the button grants').setRequired(true))
      .addStringOption((o) => o.setName('label').setDescription('Button label').setRequired(true).setMaxLength(80))
      .addStringOption((o) => o.setName('emoji').setDescription('Button emoji'))
      .addStringOption((o) => o.setName('color').setDescription('Button color')
        .addChoices({ name: 'Blurple', value: 'blurple' }, { name: 'Grey', value: 'grey' }, { name: 'Green', value: 'green' }, { name: 'Red', value: 'red' })))
    .addSubcommand((s) => s.setName('remove').setDescription('Remove a role button from a message')
      .addStringOption((o) => o.setName('message_id').setDescription('Message ID').setRequired(true))
      .addRoleOption((o) => o.setName('role').setDescription('Role to remove').setRequired(true)))
    .addSubcommand((s) => s.setName('list').setDescription('List all button roles')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === 'list') {
      const rows = q.forGuild.all(gid);
      const embed = new EmbedBuilder().setColor(config.brand.color).setTitle('🔘 Button Roles')
        .setDescription(rows.map((r) => `<@&${r.role_id}> — \`${r.label}\` ([msg](https://discord.com/channels/${gid}/${r.channel_id}/${r.message_id}))`).join('\n') || 'None configured.');
      return interaction.reply({ embeds: [embed] });
    }

    const role = interaction.options.getRole('role');
    const guard = roleGuard(interaction, role);
    if (guard) return interaction.reply({ embeds: [Embed.error(guard)], ephemeral: true });

    if (sub === 'remove') {
      const messageId = interaction.options.getString('message_id');
      if (!q.hasRole.get(messageId, role.id)) return interaction.reply({ embeds: [Embed.error('That message has no button for this role.')], ephemeral: true });
      q.removeRole.run(messageId, role.id);
      const msg = await interaction.channel.messages.fetch(messageId).catch(() => null);
      if (msg) {
        const rows = buildRows(messageId);
        await msg.edit({ components: rows }).catch(() => {});
        if (!q.count.get(messageId).c) q.removeMessage.run(messageId);
      }
      return interaction.reply({ embeds: [Embed.success(`Removed the ${role} button.`)], ephemeral: true });
    }

    const label = interaction.options.getString('label');
    const emoji = parseEmoji(interaction.options.getString('emoji'));
    const style = STYLES[interaction.options.getString('color')] || ButtonStyle.Primary;

    if (sub === 'create') {
      const embed = new EmbedBuilder().setColor(config.brand.color)
        .setTitle(interaction.options.getString('title') || '🔘 Get a Role')
        .setDescription(interaction.options.getString('description') || 'Click a button below to toggle a role.')
        .setFooter({ text: config.brand.footer });
      const msg = await interaction.channel.send({ embeds: [embed] });
      q.insert.run(gid, interaction.channel.id, msg.id, role.id, label, emoji, style);
      await msg.edit({ components: buildRows(msg.id) });
      return interaction.reply({ embeds: [Embed.success(`Button-role message created (ID \`${msg.id}\`). Add more with \`/buttonrole add\`.`)], ephemeral: true });
    }

    // add
    const messageId = interaction.options.getString('message_id');
    const msg = await interaction.channel.messages.fetch(messageId).catch(() => null);
    if (!msg || msg.author.id !== interaction.client.user.id)
      return interaction.reply({ embeds: [Embed.error('Message not found, or it was not sent by me in this channel.')], ephemeral: true });
    if (q.count.get(messageId).c >= 25) return interaction.reply({ embeds: [Embed.error('That message already has the maximum of 25 buttons.')], ephemeral: true });
    if (q.hasRole.get(messageId, role.id)) return interaction.reply({ embeds: [Embed.error('That role already has a button on this message.')], ephemeral: true });
    q.insert.run(gid, interaction.channel.id, messageId, role.id, label, emoji, style);
    await msg.edit({ components: buildRows(messageId) });
    return interaction.reply({ embeds: [Embed.success(`Added a ${role} button.`)], ephemeral: true });
  },
};

function roleGuard(interaction, role) {
  if (role.managed) return 'That role is managed by an integration and cannot be assigned.';
  if (role.id === interaction.guild.id) return 'You cannot use @everyone.';
  if (role.position >= interaction.guild.members.me.roles.highest.position) return 'That role is higher than mine in the hierarchy.';
  if (interaction.member.id !== interaction.guild.ownerId && role.position >= interaction.member.roles.highest.position)
    return 'That role is higher than or equal to your highest role.';
  return null;
}
