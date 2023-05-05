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

    const room = {
      roomId: roomId,
      players: [socket.id],
    };

    rooms.push(room);
    socket.join(roomId);
    createRoom(room);
  });

  socket.on("join_room", (roomToJoin, joinRoom) => {
    console.log(`${socket.id} joined room ${roomToJoin}`);
    if (rooms.find((room) => room.roomId === roomToJoin)) {
      const room = rooms.find((room) => room.roomId === roomToJoin);
      room.players.push(socket.id);
      socket.join(room.roomId);
      joinRoom(room);

      io.in(room.roomId).emit("new_user_joins", room);

      //wont emit to room people already in room
    } else {
      //we want this to error out
    }

    // need to emit update to room with new player number
  });
});

server.listen(8080, () => {
  console.log("Server Started on http://localhost:8080");
  console.log("Press CTRL + C to stop server");
});
