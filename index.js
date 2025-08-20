require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");
const { router: roomRoutes, attachSocket, startSong } = require("./routes/roomRoutes");
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());


const connectToMongo = require("./db");


const authRoutes = require("./routes/auth");

const PORT = process.env.PORT || 5000;

const io = new Server(server, {
  cors: { origin: "*" }, 
});


app.use("/songs", express.static(path.join(__dirname, "routes/songs")));

attachSocket(io);


connectToMongo();

app.use("/rooms", roomRoutes);
app.use("/api/auth", authRoutes);


app.get("/", (req, res) => {
  res.send("Hello, Express Server is running");
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);

 
  ["happy", "sad", "chill"].forEach((mood) => startSong(io, mood));
});
