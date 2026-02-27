const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

let currentSong = {
  user: null,
  song: null,
  artist: null,
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
    currentSong = {
      ...currentSong,
      isPlaying: false
    };
    return;
  }

  const albumName = spotify.assets?.largeText || null;

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
      updatedAt: Date.now()
    };
  } else {
    currentSong.isPlaying = true;
  }
});

app.get("/", (req, res) => {
  res.send("Spotify Status API is running!");
});

app.get("/song", (req, res) => {
  res.json(currentSong);
});

console.log(process.env.token);
app.listen(PORT, () => {
  console.log("API running on port", PORT);
});

client.login(process.env.token);
