let express = require("express");
let app = express();
// let server = app.listen(3000);
let server = app.listen(process.env.PORT);

let colorsAvailable = [
  [248, 203, 200],
  [249, 123, 106],
  [144, 169, 208],
  [3, 81, 132],
  [250, 221, 58],
  [150, 219, 222],
  [223, 72, 49],
  [178, 142, 106],
  [118, 196, 83],
];
let playerToColor = {};

app.use(express.static("public"));

let socket = require("socket.io");
let io = socket(server);

io.sockets.on("connection", newConnection);

let socketId;
let liveUsers = [];
let pixels = [];
let allPlayers = [];

setInterval(function () {
  io.sockets.emit("identifyUser");
}, 2000);

setInterval(() => {
  io.sockets.emit("heartbeatPixels", pixels);
  io.sockets.emit("heartbeatPlayers", allPlayers);
}, 100);

function User(id) {
  this.id = id;
}

function Pixel(color, size, x, y, img) {
  this.color = color;
  this.size = size;
  this.x = x;
  this.y = y;

  this.img = img;
}

let images = [];
function newConnection(socket) {
  socketId = socket.id;
  console.log("new connection " + socket.id);
  let user = new User(socket.id);
  liveUsers.push(user);

  // when client just loads on
  socket.emit("welcome", socket.id);

  socket.on("foundUser", function (label) {
    serverLabel = label;
  });

  socket.on("startPlayer", (data) => {
    let random = Math.floor(Math.random() * colorsAvailable.length);
    data.color = colorsAvailable[random];
    data.id = socketId;
    allPlayers.push(data);

    playerToColor[data.id] = data.color;

    // remove color from availableColors
    colorsAvailable.splice(random, 1);
  });

  socket.on("updatePlayer", (data) => {
    // console.log(socket.id);

    for (i = 0; i < allPlayers.length; i++) {
      if (socket.id === allPlayers[i].id) {
        allPlayers[i].x = data.x;
        allPlayers[i].y = data.y;
      }
    }
  });

  socket.on("relayImage", function (data) {
    let pixel = new Pixel(data.color, data.size, data.x, data.y, data.img);
    pixel.color = playerToColor[data.id];
    pixels.push(pixel);
  });

  //if client disconnects
  socket.on("disconnect", function () {
    console.log("client " + socket.id + "has disconnected");
    for (i = 0; i < allPlayers.length; i++) {
      if (socket.id === allPlayers[i].id) {
        colorsAvailable.push(playerToColor[allPlayers[i].id]);
        allPlayers.splice(i, 1);
      }
    }
  });
}
