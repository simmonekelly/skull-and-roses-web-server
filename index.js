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

  //   creating a new game room
  socket.on("create_room", () => {
    const roomId = uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: "-",
    }); // big_red_donkey
    // const shortName = uniqueNamesGenerator({
    //     dictionaries: [adjectives, animals, colors], // colors can be omitted here as not used
    //     length: 2
    //   }); // big-donkey
    // const roomId = uuidv4();
    socket.join(roomId);
    socket.emit("room-created", { roomId });
    console.log(roomId);
  });

  //join room
  socket.on("join_room", (data) => {
    console.log(data);
    const room = data.roomToJoin;
    socket.join(room);
    socket.emit("joined_room", data);
  });

  socket.on("card_picked", (data) => {
    console.log(data);
    const userId = socket.id;
    //send to front end

    //isnt sending to room
    socket.in(data.room).emit("display_picked_card", data);
    // socket.emit("display_picked_card", data); // works and sends data to front end
    // socket.broadcast.emit("display_picked_card", { ...data, userId });
  });
});

server.listen(8080, () => {
  console.log("Server Started on http://localhost:8080");
  console.log("Press CTRL + C to stop server");
});
