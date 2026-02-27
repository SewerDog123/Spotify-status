const { Client, GatewayIntentBits, ActivityType } = require("discord.js");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

let currentSong = {
  user: null,
  song: null,
  artist: null,
  album: null,
  isPlaying: false,
  startedAt: null,
  durationMs: null,
  progressMs: null,
  updatedAt: null,
  lastKnownProgressMs: null,
  lastProgressCheck: null
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers
  ]
});

const STALE_THRESHOLD_MS = 1000 * 12;

client.once("ready", () => {
  console.log(`Bot is online — ${client.user.tag}`);
});

client.on("presenceUpdate", (oldPresence, newPresence) => {
  if (!newPresence?.user || newPresence.user.bot) return;

  const spotify = newPresence.activities.find(
    act => act.name === "Spotify" && act.type === ActivityType.Listening
  );

  const now = Date.now();

  if (!spotify) {
    if (currentSong.isPlaying) {
      console.log(`Stopped playing: ${currentSong.song || "(unknown)"}`);
      currentSong.isPlaying = false;
      currentSong.updatedAt = now;
    }
    return;
  }

  const { details, state, assets, timestamps } = spotify;

  if (!details || !state) return;

  const songChanged =
    currentSong.song !== details ||
    currentSong.artist !== state ||
    currentSong.album !== (assets?.largeText ?? null);

  const startMs = timestamps?.start ?? null;
  const endMs = timestamps?.end ?? null;
  const durationMs = startMs && endMs ? endMs - startMs : null;

  currentSong = {
    user: newPresence.user.username,
    song: details,
    artist: state,
    album: assets?.largeText ?? null,
    isPlaying: true,
    startedAt: startMs,
    durationMs,
    progressMs: startMs ? now - startMs : 0,
    updatedAt: now,
    lastKnownProgressMs: startMs ? now - startMs : null,
    lastProgressCheck: now
  };

  if (songChanged) {
    console.log(`Now playing: ${currentSong.song} - ${currentSong.artist}`);
  }
});

app.get("/song", (req, res) => {
  const now = Date.now();

  if (
    currentSong.isPlaying &&
    currentSong.updatedAt &&
    now - currentSong.updatedAt > STALE_THRESHOLD_MS
  ) {
    console.log("Marked as stopped (presence update timed out)");
    currentSong.isPlaying = false;
  }

  if (currentSong.isPlaying && currentSong.startedAt) {
    const calculatedProgress = now - currentSong.startedAt;

    if (
      currentSong.lastKnownProgressMs &&
      calculatedProgress < currentSong.lastKnownProgressMs - 1500
    ) {
      currentSong.isPlaying = false;
      console.log("Detected possible song change or seek backward");
    } else {
      currentSong.progressMs = calculatedProgress;
      currentSong.lastKnownProgressMs = calculatedProgress;
      currentSong.lastProgressCheck = now;
    }

    if (currentSong.durationMs && calculatedProgress > currentSong.durationMs + 2000) {
      currentSong.isPlaying = false;
      console.log("Song duration exceeded → marked as stopped");
    }
  }

  res.json({
    ...currentSong,
    progressPercent:
      currentSong.durationMs && currentSong.progressMs
        ? Math.min(100, (currentSong.progressMs / currentSong.durationMs) * 100)
        : null
  });
});

app.get("/", (req, res) => {
  res.send("Spotify Status API — Running");
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
});

client.login(process.env.TOKEN || process.env.token)
  .catch(err => {
    console.error("Login failed:", err);
    process.exit(1);
  });

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
