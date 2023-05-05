// initialize Express in project
const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const {
  uniqueNamesGenerator,
  adjectives,
  animals,
  colors,
} = require("unique-names-generator");

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = [];

io.on("connection", (socket) => {
  console.log(`user connected: ${socket.id}`);

  //   creating a new game room
  socket.on("create_room", (createRoom) => {
    const roomId = uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: "-",
    });

    rooms.push(roomId);
    createRoom(roomId);
    //need to actually join room socket
  });

  socket.on("join_room", (location, joinRoom) => {
    console.log(location);
    if (rooms.includes(location.id)) {
      joinRoom(location.id);
    } else {
      rooms.push(location.id);
      joinRoom(location.id);
    }

    // need to join room socket
  });
});

server.listen(8080, () => {
  console.log("Server Started on http://localhost:8080");
  console.log("Press CTRL + C to stop server");
});
