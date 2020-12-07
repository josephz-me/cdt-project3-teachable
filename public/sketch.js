// Classifier Variable
let classifier;
// Model URL
let soundModel = "https://teachablemachine.withgoogle.com/models/diLxkb-WT/";
let label = "listening...";
// Video
let video;
let flippedVideo;
// To store the classification

//Player
let player;
let allClientPlayers;
let brushSizeIndex = 0;

//Grid
let grid = 15;
let xmargin = 400;
let ymargin = 20;
let w = 50;

// Load the model first
function preload() {
  classifier = ml5.soundClassifier(soundModel + "model.json");
}

let socket;
let clientPixels;

let clientImages = [];

function saveImage(raw, pixel) {
  return function () {
    var img = createImage(raw.width, raw.height);
    img.drawingContext.drawImage(raw, 0, 0);
    clientImages[pixel] = img;
  };
}

function setup() {
  socket = io.connect("https://afternoon-mountain-16149.herokuapp.com/");
  //socket = io.connect("http://localhost:3000");

  socket.on("identifyUser", () => {
    socket.emit("foundUser", label);
  });

  socket.on("heartbeatPixels", (data) => {
    clientPixels = data;

    for (pixel in clientPixels) {
      let drawnPixel = clientPixels[pixel];

      if (!(pixel in clientImages)) {
        let raw = new Image();
        raw.src = drawnPixel.img; // base64 data here
        raw.onload = saveImage(raw, pixel);
      }
    }
  });

  socket.on("heartbeatPlayers", (data) => {
    allClientPlayers = data;
  });

  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);

  video.size(320 / 20, 240 / 20);
  //video.hide();

  // flippedVideo = ml5.flipImage(video);

  // Start classifying
  // The sound model will continuously listen to the microphone
  classifier.classify(gotResult);
  //Set up player
  player = new Player(0, 0, xmargin, ymargin, w, grid, [300, 0, 0]); //color determined by socket
  socket.emit("startPlayer", player);
}

let clicked = false;
function draw() {
  background("#111111");

  //Grid
  drawGrid(grid, xmargin, ymargin, w);
  socket.emit("updatePlayer", player);

  for (key in clientImages) {
    let drawnPixel = clientPixels[key];
    let pixelImage = clientImages[key];

    if (pixelImage != undefined) {
      image(
        pixelImage,
        drawnPixel.x,
        drawnPixel.y,
        drawnPixel.size,
        drawnPixel.size
      ); // draw the image, etc here
    } else {
      // console.log("failed:", i, " is ", drawnPixel);
    }
  }

  for (playerNum in allClientPlayers) {
    let drawnPlayer = allClientPlayers[playerNum];

    // drawnPlayer.show();

    push();
    stroke(...drawnPlayer.color);
    fill(...drawnPlayer.color, 50);
    strokeWeight(8);
    console.log(drawnPlayer.w);
    rect(
      drawnPlayer.x * w + drawnPlayer.xmargin,
      drawnPlayer.y * w + drawnPlayer.ymargin,
      drawnPlayer.w,
      drawnPlayer.w
    );
    pop();
  }

  // Draw the label
  fill(255);
  textSize(16);
  textAlign(CENTER);
  text(label, width / 2, height - 4);
}

function mousePressed() {
  player.clickPixel(mouseX, mouseY);
  return false;
}

let pixelValue = 20;

function keyPressed() {
  if (keyCode === LEFT_ARROW) {
    player.moveLeft();
  } else if (keyCode === RIGHT_ARROW) {
    player.moveRight();
  } else if (keyCode === UP_ARROW) {
    player.moveUp();
  } else if (keyCode === DOWN_ARROW) {
    player.moveDown();
  } else if (keyCode === ENTER) {
    // let currentImage = flippedVideo

    //Webcam capture
    video.size(320 / pixelValue, 240 / pixelValue);
    video.loadPixels();
    const image64 = video.canvas.toDataURL();

    let currentPixel = {
      color: player.color,
      size: player.w,
      x: player.x * w + player.xmargin,
      y: player.y * w + player.ymargin,

      img: image64,
    };
    socket.emit("relayImage", currentPixel);
  }
  if (keyCode === 32) {
    brushSizeIndex += 1;
    brushSizeIndex = brushSizeIndex%3;
    if (brushSizeIndex == 0) {
      player.sizePixelSmall();
    } if (brushSizeIndex == 1) {
      player.sizePixelMed();
    } if (brushSizeIndex == 2) {
      player.sizePixelLarge();
    }
    console.log("spacebar:",player.w);
  }
}

function drawGrid(grid, xmargin, ymargin, w) {
  push();
  stroke("white");
  fill("#111111");
  for (let i = 0; i < grid; i++) {
    for (let j = 0; j < grid; j++) {
      rect(i * w + xmargin, j * w + ymargin, w, w);
    }
  }
  pop();
}

class Player {
  constructor(x, y, xmargin, ymargin, w, grid, color, id) {
    this.x = x;
    this.y = y;
    this.numCells = 1;
    this.xmargin = xmargin;
    this.ymargin = ymargin;
    this.w = w;
    this.originalw = w;
    this.grid = grid;
    this.color = color;
    this.id = id;
  }

  show() {
    stroke(...this.color);
    fill(...this.color);
    rect(this.x * this.w + this.xmargin, this.y * this.w + this.ymargin, w, w);
  }

  clickPixel(mouseX, mouseY) {
    for (let i = 0; i < this.grid; i++) {
      let lowX = i * this.originalw + this.xmargin;
      let highX = lowX + this.originalw;
      // console.log("lowX:", lowX, "highX", highX);
      for (let j = 0; j < this.grid; j++) {
        let lowY = j * this.originalw + this.ymargin;
        let highY = lowY + this.originalw;
        // console.log("lowY:", lowY, "highY:", highY);
        if (
          mouseX >= lowX &&
          mouseX <= highX &&
          mouseY >= lowY &&
          mouseY <= highY
        ) {
          this.x = i;
          this.y = j;
        }
      }
    }
  }

  moveRight() {
    if (this.x >= this.grid - this.numCells) {
      this.x = 0;
    } else {
      this.x += 1;
    }
  }

  moveLeft() {
    if (this.x <= 0) {
      this.x = this.grid - this.numCells;
    } else {
      this.x -= 1;
    }
  }

  moveUp() {
    if (this.y <= 0) {
      this.y = this.grid - this.numCells;
    } else {
      this.y -= 1;
    }
  }

  moveDown() {
    if (this.y >= this.grid - this.numCells) {
      this.y = 0;
    } else {
      this.y += 1;
    }
  }

  sizePixelSmall(){
    this.w = this.originalw;
    this.numCells = 1;
  }
  
  sizePixelMed(){
    console.log("medium");
    this.w = this.originalw*2;
    this.numCells = 2;
  }

  sizePixelLarge(){
    console.log("large");
    this.w = this.originalw*3;
    this.numCells = 3;
  }
 }

// The model recognizing a sound will trigger this event
let previousLabel;

function gotResult(error, results) {
  if (error) {
    console.error(error);
    return;
  }
  // The results are in an array ordered by confidence.
  // console.log(results);
  if (results[0].confidence > 0.75) {
    label = results[0].label;

    previousLabel = label;

    if (label === "Clapping") {
      pixelValue = 150;
      $(".clapping").addClass("highlighted");
      $(".knocking").removeClass("highlighted");
      $(".crumpling").removeClass("highlighted");
    } else if (label === "Knocking") {
      pixelValue = 80;
      $(".knocking").addClass("highlighted");
      $(".clapping").removeClass("highlighted");
      $(".crumpling").removeClass("highlighted");
    } else if (label === "Paper Crumpling") {
      console.log($(".crumpling"));
      pixelValue = 20;
      $(".crumpling").addClass("highlighted");
      $(".knocking").removeClass("highlighted");
      $(".clapping").removeClass("highlighted");
    }
  } else {
    label = previousLabel;
  }
}
