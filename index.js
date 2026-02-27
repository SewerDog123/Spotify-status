const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const app = express();
const PORT = 3000;

let currentSong = {
  user: null,
  song: null,
  artist: null
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

  if (spotify) {
    currentSong = {
      user: newPresence.user.username,
      song: spotify.details,
      artist: spotify.state
    };

    console.log("Updated:", currentSong);
  }
});

app.get("/song", (req, res) => {
  res.json(currentSong);
});

app.listen(PORT, () => {
  console.log("API running on port", PORT);
});

client.login("MTQ3Njg3OTc5OTY3ODE0NDU5NQ.GwxBS1.6rDXBw7yYjw1r4_U3Z4T5iicBsXK-q-c4LjTGU");