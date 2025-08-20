const express = require("express");
const fs = require("fs");
const path = require("path");
const mm = require("music-metadata");
const router = express.Router();
let ioInstance;

// Room state to track current song and start time
const roomState = {
  happy: null,
  sad: null,
  chill: null,
};

const songsDir = {
  happy: path.join(__dirname, "songs/happy"),
  sad: path.join(__dirname, "songs/sad"),
  chill: path.join(__dirname, "songs/chill"),
};

const currentSongIndex = {
  happy: 0,
  sad: 0,
  chill: 0,
};

const getNextSong = (mood) => {
  const files = fs.readdirSync(songsDir[mood]).filter((f) => f.endsWith(".mp3"));
  if (!files.length) return null;
  const songName = files[currentSongIndex[mood] % files.length];
  currentSongIndex[mood] = (currentSongIndex[mood] + 1) % files.length;
  return {
    name: songName,
    url: `/songs/${mood}/${songName}`,
  };
};

// Start next song in the room and track start time
const startSong = async (io, mood) => {
  const song = getNextSong(mood);
  if (!song) return;

  roomState[mood] = {
    ...song,
    startTime: new Date().toISOString(),
  };

  io.to(mood).emit("newSong", roomState[mood]);

  const songPath = path.join(songsDir[mood], song.name);

  try {
    const metadata = await mm.parseFile(songPath);
    const duration = metadata.format.duration * 1000; // ms

    setTimeout(() => startSong(io, mood), duration);
  } catch (err) {
    console.log("Error reading song duration:", err);
    // fallback: 3 minutes if something fails
    setTimeout(() => startSong(io, mood), 3 * 60 * 1000);
  }
};

const attachSocket = (io) => {
  ioInstance = io;

  io.on("connection", (socket) => {
    console.log("New user connected: " + socket.id);

    socket.on("joinRoom", async (mood) => {
      if (!["happy", "sad", "chill"].includes(mood)) return;
      socket.join(mood);
      console.log(`${socket.id} joined ${mood} room`);

      // If a song is already playing, send current state
      if (roomState[mood]) {
        socket.emit("newSong", roomState[mood]);
      } else {
        // Start the first song if none is playing
        await startSong(io, mood);
      }
    });

    socket.on("sendMessage", ({ mood, message, username }) => {
      io.to(mood).emit("receiveMessage", { username, message });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected: " + socket.id);
    });
  });
};

// Test route
router.get("/", (req, res) => {
  res.send("Room Routes Working");
});

// Route to get current song of a mood
router.get("/:mood", (req, res) => {
  const mood = req.params.mood;
  if (!["happy", "sad", "chill"].includes(mood)) {
    return res.status(400).json({ error: "Invalid mood" });
  }

  const current = roomState[mood];
  if (!current) {
    return res.json({ message: "No song is currently playing" });
  }

  res.json({
    name: current.name,
    url: current.url,
    startTime: current.startTime,
  });
});

module.exports = { router, attachSocket, startSong };
