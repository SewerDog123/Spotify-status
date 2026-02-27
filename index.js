const { Client, GatewayIntentBits } = require("discord.js");
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
  duration: null,
  progress: null,
  updatedAt: null
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers
  ]
});

client.once("clientReady", () => {
  console.log("Bot is online!");
});

client.on("presenceUpdate", (oldPresence, newPresence) => {
  if (!newPresence) return;

  const spotify = newPresence.activities.find(
    a => a.name === "Spotify" && a.type === 2
  );

  if (!spotify) {
    return;
  }

  const start = spotify.timestamps?.start ?? null;
  const end = spotify.timestamps?.end ?? null;
  const now = Date.now();

  const duration = start && end ? end - start : null;

  if (end && now > end) {
    currentSong.isPlaying = false;
    return;
  }

  const albumName = spotify.assets?.largeText ?? null;

  const sameSong =
    currentSong.song === spotify.details &&
    currentSong.artist === spotify.state;

  if (!sameSong) {
    currentSong = {
      user: newPresence.user.username,
      song: spotify.details,
      artist: spotify.state,
      album: albumName,
      isPlaying: true,
      startedAt: start,
      duration,
      progress: now - start,
      updatedAt: Date.now()
    };

    console.log("Changed:", currentSong.song);
  } else {
    currentSong.isPlaying = true;
  }
});

app.get("/", (req, res) => {
  res.send("Spotify Status API Running");
});

app.get("/song", (req, res) => {
  if (currentSong.startedAt) {
    const now = Date.now();
    const newProgress = now - currentSong.startedAt;

    if (Math.abs(newProgress - lastProgress) < 1000) {
      if (now - lastProgressCheck > 5000) {
        currentSong.isPlaying = false;
      }
    } else {
      currentSong.isPlaying = true;
      lastProgressCheck = now;
    }

    lastProgress = newProgress;
    currentSong.progress = newProgress;
  }

  res.json(currentSong);
});

app.listen(PORT, () => {
  console.log("API running on port", PORT);
});

client.login(process.env.token);
