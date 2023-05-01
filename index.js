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

io.on("connection", (socket) => {
  console.log(`user connected: ${socket.id}`);

  socket.emit("user_connected", { userId: socket.id });

  //   creating a new game room
  socket.on("create_room", () => {
    const roomId = uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: "-",
    });
    socket.join(roomId);
    socket.emit("room-created", { roomId });
    console.log(`room created: ${roomId}`);
    console.log(socket.rooms);
  });

  //join room
  socket.on("join_room", (data) => {
    const room = data.roomToJoin;
    socket.join(room);
    socket.emit("joined_room", data);
    console.log(`joined room: ${room}`);
    console.log(socket.rooms);
  });

  socket.on("card_picked", (data) => {
    console.log("card picked");
    console.log(data);
    console.log(socket.rooms);

    //send to front end
    io.in(data.room).emit("display_picked_card", data);
  });
});

server.listen(8080, () => {
  console.log("Server Started on http://localhost:8080");
  console.log("Press CTRL + C to stop server");
});
