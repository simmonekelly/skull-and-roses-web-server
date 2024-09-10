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
const baseCards = ["rose", "rose", "skull", "rose", "rose"]

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
  console.log(`user connected: ${socket.id}`);

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
        "update_countdown",
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
    (currentRoom, user, currentUser, updatedMatStatus, callback) => {
      console.log({currentRoom, user, currentUser, updatedMatStatus, callback})
      const data = findRoomAndUser(currentRoom, user);
      const currentUserData = findUser(data.room, currentUser)

      if (data && currentUser) {

        if (updatedMatStatus) {
  
          //reset current user cards
          currentUserData.cards = baseCards;

          //add logic to check what current status is
          //if true then emit event that x user has won the game
          console.log("true");
          if (user === currentUser) {
            //update current user
            currentUserData.matStatus = updatedMatStatus;
            callback(currentUserData);
          } else {

            callback(currentUserData);
          }

          //reset all user cards
          data.room.players.forEach((player) => (
            player.cards = baseCards
          ))
          data.user.matStatus = updatedMatStatus;
          data.room.stockPile = []
          console.log({data})
          io.in(data.room.roomId).emit("update_room", data.room);
          io.in(data.room.roomId).emit("show_update_modal");
        } else {
          console.log("false");
          //for now removes the last card a user has

          //will need to log how many cards each user has, and rest accordingly
          //remove 1 card from user that lost
          data.user.cards.splice(data.user.cards.length - 1, 1);
          if (user === currentUser) {
            callback(data.user);
          }
          //emit update modal
          io.in(data.room.roomId).emit("update_room", data.room);
        }
      } else {
        console.log("cant update mat status: no room or user");
      }
    }
  );
});

server.listen(8080, () => {
  console.log("Server Started on http://localhost:8080");
  console.log("Press CTRL + C to stop server");
});
