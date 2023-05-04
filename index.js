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

  //   socket.on("hello", (data) => {
  //     console.log({ data });
  //   });

  //   creating a new game room
  socket.on("create_room", (callback) => {
    const roomId = uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: "-",
    });
    console.log({ roomId });
    callback(roomId);
  });
});

server.listen(8080, () => {
  console.log("Server Started on http://localhost:8080");
  console.log("Press CTRL + C to stop server");
});
