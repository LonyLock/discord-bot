'use strict';

/**
 * Voice music manager built on @discordjs/voice + play-dl.
 *
 * The heavy voice/streaming dependencies are loaded lazily so the rest of the
 * bot works even if they fail to install. If they are unavailable, isAvailable()
 * returns false and the music commands politely report it.
 */

let voice = null;
let play = null;
let available = false;
try {
  voice = require('@discordjs/voice');
  play = require('play-dl');
  available = true;
} catch {
  available = false;
}

/** Per-guild queue object kept on client.musicQueues. */
function getQueue(client, guildId) {
  return client.musicQueues.get(guildId);
}

function createQueue(client, { guild, voiceChannel, textChannel }) {
  const player = voice.createAudioPlayer({
    behaviors: { noSubscriber: voice.NoSubscriberBehavior.Pause },
  });
  const queue = {
    guildId: guild.id,
    voiceChannel,
    textChannel,
    connection: null,
    player,
    songs: [],
    playing: false,
    loop: false,
    volume: 1,
  };

  player.on(voice.AudioPlayerStatus.Idle, () => {
    if (queue.loop && queue.current) queue.songs.push(queue.current);
    playNext(client, guild.id);
  });
  player.on('error', (err) => {
    queue.textChannel?.send(`⚠️ Playback error: ${err.message}`).catch(() => {});
    playNext(client, guild.id);
  });

  client.musicQueues.set(guild.id, queue);
  return queue;
}

async function connect(queue, guild) {
  const connection = voice.joinVoiceChannel({
    channelId: queue.voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
  });
  connection.subscribe(queue.player);
  queue.connection = connection;
  return connection;
}

/** Search YouTube for a query or resolve a direct URL; returns a song object. */
async function resolveSong(query, requestedBy) {
  if (play.yt_validate(query) === 'video') {
    const info = await play.video_basic_info(query);
    const d = info.video_details;
    return { title: d.title, url: d.url, duration: d.durationRaw, thumbnail: d.thumbnails?.[0]?.url, requestedBy };
  }
  const results = await play.search(query, { limit: 1, source: { youtube: 'video' } });
  if (!results.length) return null;
  const d = results[0];
  return { title: d.title, url: d.url, duration: d.durationRaw, thumbnail: d.thumbnails?.[0]?.url, requestedBy };
}

async function playNext(client, guildId) {
  const queue = client.musicQueues.get(guildId);
  if (!queue) return;
  const song = queue.songs.shift();
  if (!song) {
    queue.playing = false;
    queue.current = null;
    // Disconnect after a short idle period.
    setTimeout(() => {
      const q = client.musicQueues.get(guildId);
      if (q && !q.playing) {
        q.connection?.destroy();
        client.musicQueues.delete(guildId);
      }
    }, 60_000);
    return;
  }
  queue.current = song;
  queue.playing = true;
  try {
    const stream = await play.stream(song.url, { quality: 2 });
    const resource = voice.createAudioResource(stream.stream, { inputType: stream.type, inlineVolume: true });
    resource.volume?.setVolume(queue.volume);
    queue.player.play(resource);
    queue.textChannel?.send(`🎶 Now playing: **${song.title}** \`${song.duration}\` — requested by ${song.requestedBy}`).catch(() => {});
  } catch (err) {
    queue.textChannel?.send(`⚠️ Could not play **${song.title}**: ${err.message}`).catch(() => {});
    playNext(client, guildId);
  }
}

module.exports = {
  isAvailable: () => available,
  getQueue,
  createQueue,
  connect,
  resolveSong,
  playNext,
};
