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
  connectionStateRecovery: {
    // the backup duration of the sessions and the packets
    maxDisconnectionDuration: 2 * 60 * 1000,
    // whether to skip middlewares upon successful recovery
    skipMiddlewares: true,
  },
});

const rooms = [];
const baseCards = ["rose", "rose", "skull", "rose", "rose"];

const findRoom = (currentRoom) => {
  const filteredRoom = rooms.find((room) => room.roomId === currentRoom);
  return filteredRoom;
};

const findUser = (room, currentUser) => {
  const filteredUser = room.players.find((player) => player.id === currentUser);
  return filteredUser;
};

const findRoomAndUser = (currentRoom, currentUser) => {
  const room = findRoom(currentRoom);

  if (!room) {
    return undefined;
  }

  const user = findUser(room, currentUser);

  if (!user) {
    return undefined;
  }

  return { room, user };
};

io.on("connection", (socket) => {
  if (socket.recovered) {
    console.log("recovered");
    // recovery was successful: socket.id, socket.rooms and socket.data were restored
  } else {
    console.log("new");
    // new or unrecoverable session
    console.log({ user: socket.id });
  }

  //   creating a new game room
  socket.on("create_room", (createRoom) => {
    const roomId = uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: "-",
    });

    const currentUser = {
      id: socket.id,
      cards: ["rose", "rose", "skull", "rose", "rose"],
      matStatus: false,
      gameControler: true,
    };

    const room = {
      roomId: roomId,
      players: [currentUser],
      stockPile: [],
    };

    const newRoom = {
      room,
      currentUser: currentUser,
    };

    rooms.push(room);
    socket.join(roomId);
    createRoom(newRoom);
  });

  //when a user joins a game room
  socket.on("join_room", (roomToJoin, joinRoom) => {
    console.log(`${socket.id} joined room ${roomToJoin}`);
    if (rooms.find((room) => room.roomId === roomToJoin)) {
      const room = rooms.find((room) => room.roomId === roomToJoin);

      const currentUser = {
        id: socket.id,
        cards: ["rose", "rose", "skull", "rose", "rose"],
        matStatus: false,
        gameControler: false,
      };

      room.players.push(currentUser);

      const joinedRoom = {
        room,
        currentUser,
      };
      socket.join(room.roomId);
      joinRoom(joinedRoom);
      console.log({ room: socket.rooms });

      io.in(room.roomId).emit("new_user_joins", room);
    } else {
      //handle error
    }
  });

  socket.on(
    "submit_card",
    (currentRoom, currentUser, cardData, updateCards) => {
      console.log("update card");
      if (rooms.find((room) => room.roomId === currentRoom)) {
        const room = rooms.find((room) => room.roomId === currentRoom);
        const user = room.players.find((player) => player.id === currentUser);

        // console.log({room, user, cardData})
        user.cards.splice(cardData.cardIndex, 1);
        // console.log({user})
        room.stockPile.push(cardData.cardText);

        updateCards(user);

        io.in(room.roomId).emit("update_room", room);
      } else {
        //handle error
      }
    }
  );

  socket.on("submit_guess", (currentRoom, currentUser, userGuess, callback) => {
    const data = findRoomAndUser(currentRoom, currentUser);
    if (data) {
      // console.log({rooms, data, currentRoom, currentUser, userGuess, callback})
      callback();

      io.in(data.room.roomId).emit(
        "show_guess_result_modal",
        data.room,
        data.user.id,
        userGuess
      );
    } else {
      console.log("error submitting guess: no room or user");
    }
  });

  socket.on(
    "update_mat_status",
    (
      currentRoomId,
      guessingUserId,
      currentUserId,
      updatedMatStatus,
      callback
    ) => {
      console.log({
        currentRoomId,
        guessingUserId,
        currentUserId,
        updatedMatStatus,
        callback,
      });
      const data = findRoomAndUser(currentRoomId, guessingUserId);
      const currentUserData = findUser(data.room, currentUserId);

      if (data && currentUserId) {
        if (updatedMatStatus) {
          console.log("true");
          currentUserData.cards = baseCards;
          if (guessingUserId === currentUserId) {
            //update current user
            currentUserData.matStatus = updatedMatStatus;
            callback(currentUserData);
          }

          data.user.matStatus = updatedMatStatus;
          io.in(data.room.roomId).emit("update_room", data.room);
        } else {
          console.log("false");
          io.in(data.room.roomId).emit("update_room", data.room);
        }
      } else {
        console.log("cant update mat status: no room or user");
      }
    }
  );

  socket.on(
    "reset_for_next_round",
    (currentRoomId, currentUserId, callback) => {
      console.log("reset");
      const data = findRoomAndUser(currentRoomId, currentUserId);
      //why is this not running v
      data.room.players.forEach((player) => {
        console.log({ cards: player.cards, baseCards });
        player.cards = baseCards;
      });
      data.room.stockPile = [];
      callback(data.user);
      io.in(data.room.roomId).emit("update_room", data.room);
    }
  );

  socket.on("leave_room", (roomToLeave, currentUserId, callback) => {
    console.log(`${currentUserId} left room ${roomToLeave}`);
    if (rooms.find((room) => room.roomId === roomToLeave)) {
      const room = rooms.find((room) => room.roomId === roomToLeave);
      const playerIndex = room.players.findIndex(
        (user) => user.id === currentUserId
      );

      room.players.splice(playerIndex, 1);

      socket.leave(roomToLeave);
      callback();

      io.in(room.roomId).emit("update_room", room);
    } else {
      //handle error
    }
  });
});

server.listen(8080, () => {
  console.log("Server Started on http://localhost:8080");
  console.log("Press CTRL + C to stop server");
});
