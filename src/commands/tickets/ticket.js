'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { setGuildConfig, getGuildConfig, db } = require('../../database/db');
const Embed = require('../../utils/embed');
const tickets = require('../../services/tickets');

const getTicketRow = db.prepare('SELECT * FROM tickets WHERE channel_id = ?');

module.exports = {
  category: 'tickets',
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Support ticket system')
    .addSubcommand((s) => s.setName('open').setDescription('Open a support ticket')
      .addStringOption((o) => o.setName('subject').setDescription('What do you need help with?')))
    .addSubcommand((s) => s.setName('close').setDescription('Close the current ticket'))
    .addSubcommand((s) => s.setName('add').setDescription('Add a user to this ticket')
      .addUserOption((o) => o.setName('user').setDescription('User to add').setRequired(true)))
    .addSubcommand((s) => s.setName('remove').setDescription('Remove a user from this ticket')
      .addUserOption((o) => o.setName('user').setDescription('User to remove').setRequired(true)))
    .addSubcommand((s) => s.setName('setup').setDescription('Post a ticket panel & configure (Manage Server)')
      .addChannelOption((o) => o.setName('category').setDescription('Category for new tickets').addChannelTypes(ChannelType.GuildCategory))
      .addRoleOption((o) => o.setName('support_role').setDescription('Staff role for tickets'))
      .addChannelOption((o) => o.setName('log_channel').setDescription('Channel for ticket logs').addChannelTypes(ChannelType.GuildText))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'open') {
      await interaction.deferReply({ ephemeral: true });
      const result = await tickets.createTicket(interaction.guild, interaction.user, interaction.options.getString('subject') || 'No subject provided');
      return interaction.editReply({ embeds: [result.error ? Embed.error(result.error) : Embed.success(`Ticket created: ${result.channel}`)] });
    }

    if (sub === 'close') {
      if (!getTicketRow.get(interaction.channel.id)) return interaction.reply({ embeds: [Embed.error('This is not a ticket channel.')], ephemeral: true });
      await interaction.reply({ embeds: [Embed.warn('Closing this ticket…')] });
      return tickets.closeTicket(interaction.channel, interaction.user);
    }

    if (sub === 'add' || sub === 'remove') {
      if (!getTicketRow.get(interaction.channel.id)) return interaction.reply({ embeds: [Embed.error('This is not a ticket channel.')], ephemeral: true });
      const user = interaction.options.getUser('user');
      await interaction.channel.permissionOverwrites.edit(user.id, sub === 'add'
        ? { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }
        : { ViewChannel: false }).catch(() => {});
      return interaction.reply({ embeds: [Embed.success(`${sub === 'add' ? 'Added' : 'Removed'} ${user} ${sub === 'add' ? 'to' : 'from'} this ticket.`)] });
    }

    if (sub === 'setup') {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild))
        return interaction.reply({ embeds: [Embed.error('You need Manage Server to set up tickets.')], ephemeral: true });
      const category = interaction.options.getChannel('category');
      const role = interaction.options.getRole('support_role');
      const log = interaction.options.getChannel('log_channel');
      const patch = {};
      if (category) patch.ticket_category = category.id;
      if (role) patch.ticket_support_role = role.id;
      if (log) patch.ticket_log_channel = log.id;
      setGuildConfig(interaction.guild.id, patch);
      await interaction.channel.send(tickets.panelComponents());
      return interaction.reply({ embeds: [Embed.success('Ticket panel posted and settings saved.')], ephemeral: true });
    }
  },
};
