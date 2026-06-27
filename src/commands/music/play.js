'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const music = require('../../services/music');

module.exports = {
  category: 'music',
  guildOnly: true,
  botPermissions: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube (URL or search terms)')
    .addStringOption((o) => o.setName('query').setDescription('Song name or YouTube URL').setRequired(true)),
  async execute(interaction, client) {
    if (!music.isAvailable()) return interaction.reply({ embeds: [Embed.error('The music system is not available (voice dependencies missing).')], ephemeral: true });
    const vc = interaction.member.voice.channel;
    if (!vc) return interaction.reply({ embeds: [Embed.error('You must be in a voice channel.')], ephemeral: true });
    if (!vc.joinable) return interaction.reply({ embeds: [Embed.error('I cannot join your voice channel.')], ephemeral: true });
    await interaction.deferReply();
    const query = interaction.options.getString('query');
    let song;
    try { song = await music.resolveSong(query, interaction.user.toString()); }
    catch (e) { return interaction.editReply({ embeds: [Embed.error(`Search failed: ${e.message}`)] }); }
    if (!song) return interaction.editReply({ embeds: [Embed.error('No results found.')] });

    let queue = music.getQueue(client, interaction.guild.id);
    if (!queue) {
      queue = music.createQueue(client, { guild: interaction.guild, voiceChannel: vc, textChannel: interaction.channel });
      try { await music.connect(queue, interaction.guild); }
      catch (e) { client.musicQueues.delete(interaction.guild.id); return interaction.editReply({ embeds: [Embed.error(`Could not connect: ${e.message}`)] }); }
    }
    queue.songs.push(song);
    const embed = new EmbedBuilder().setColor(config.brand.color)
      .setAuthor({ name: queue.playing ? 'Added to queue' : 'Now playing' })
      .setTitle(song.title).setURL(song.url)
      .setThumbnail(song.thumbnail || null)
      .addFields({ name: 'Duration', value: song.duration || 'N/A', inline: true }, { name: 'Position', value: queue.playing ? `#${queue.songs.length}` : 'Now', inline: true })
      .setFooter({ text: `Requested by ${interaction.user.tag}` });
    if (!queue.playing) await music.playNext(client, interaction.guild.id);
    return interaction.editReply({ embeds: [embed] });
  },
};
