// Classifier Variable
let classifier;
// Model URL
let imageModelURL = "https://teachablemachine.withgoogle.com/models/Q6nS6q6Sk/";
// Video
let video;
let flippedVideo;
// To store the classification
let label = "";

//Player
let player;
let allClientPlayers;

//Grid
let grid = 15;
let xmargin = 400;
let ymargin = 200;
let w = 50;

// Load the model first
function preload() {
  classifier = ml5.imageClassifier(imageModelURL + "model.json");
}

let socket;
let clientPixels;

let clientImages = [];

function setup() {
  // socket = io.connect("http://localhost:3000");
  socket = io.connect("https://afternoon-mountain-16149.herokuapp.com/");

  socket.on("identifyUser", () => {
    socket.emit("foundUser", label);
  });

  socket.on("heartbeatPixels", (data) => {
    clientPixels = data;

    for (pixel in clientPixels) {
      let drawnPixel = clientPixels[pixel];

      var raw = new Image();
      raw.src = drawnPixel.img; // base64 data here
      // console.log(`Pixel: ${pixel}, ${raw.src.slice(0, 40)}`);

      raw.onload = function () {
        img = createImage(raw.width, raw.height);
        img.drawingContext.drawImage(raw, 0, 0);

        clientImages[pixel] = img;
      };
    }
    // for (let i = 0; i < clientPixels.length; i++) {
    //   let drawnPixel = clientPixels[i];

    //   var raw = new Image();
    //   raw.src = drawnPixel.img; // base64 data here
    //   raw.onload = function () {
    //     console.log(i);
    //     let img = createImage(raw.width, raw.height);
    //     img.drawingContext.drawImage(raw, 0, 0);
    //     clientImages[i] = img;
    //   };
    // }
  });

  socket.on("heartbeatPlayers", (data) => {
    allClientPlayers = data;
  });

  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);

  video.size(320 / 10, 240 / 10);
  //video.hide();

  // flippedVideo = ml5.flipImage(video);
  // Start classifying
  classifyVideo();

  //Set up player

  player = new Player(0, 0, xmargin, ymargin, w, grid, [300, 0, 0]); //color determined by socket
  socket.emit("startPlayer", player);
}

let clicked = false;
function draw() {
  background(0);

  //Grid
  drawGrid(grid, xmargin, ymargin, w);
  socket.emit("updatePlayer", player);

  for (playerNum in allClientPlayers) {
    let drawnPlayer = allClientPlayers[playerNum];

    // drawnPlayer.show();

    push();
    stroke(...drawnPlayer.color);
    fill(...drawnPlayer.color, 50);
    strokeWeight(8);
    rect(
      drawnPlayer.x * drawnPlayer.w + drawnPlayer.xmargin,
      drawnPlayer.y * drawnPlayer.w + drawnPlayer.ymargin,
      w,
      w
    );
    pop();
  }

  //image(flippedVideo, 0, 0, 320, 240);
  for (pixel in clientPixels) {
    if (typeof clientPixels !== "undefined") {
      for (let i = 0; i < clientPixels.length; i++) {
        let drawnPixel = clientPixels[i];
        let pixelImage;

        pixelImage = clientImages[i.toString()];

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
    }

    // Draw the label
    fill(255);
    textSize(16);
    textAlign(CENTER);
    text(label, width / 2, height - 4);
  }
}
// Get a prediction for the current video frame
function classifyVideo() {
  flippedVideo = ml5.flipImage(video);
  classifier.classify(flippedVideo, gotResult);
  flippedVideo.remove();
}

// When we get a result
function gotResult(error, results) {
  // If there is an error
  if (error) {
    console.error(error);
    return;
  }
  // The results are in an array ordered by confidence.
  // console.log(results[0]);
  label = results[0].label;
  // Classifiy again!
  classifyVideo();
}

function mousePressed() {
  player.clickPixel(mouseX, mouseY);
  return false;
}

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
    let value = random(30, 150);
    video.size(320 / value, 240 / value);
    // video.size(320 / 10, 240 / 10);
    video.loadPixels();
    const image64 = video.canvas.toDataURL();
    //console.log(image64);

    let currentPixel = {
      color: player.color,
      size: w,
      x: player.x * player.w + player.xmargin,
      y: player.y * player.w + player.ymargin,

      img: image64,
    };
    socket.emit("relayImage", currentPixel);
  }
}

function drawGrid(grid, xmargin, ymargin, w) {
  push();
  fill(200);
  stroke(0);
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
    this.xmargin = xmargin;
    this.ymargin = ymargin;
    this.w = w;
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
    // console.log("mouseX:", mouseX, "mouseY:", mouseY);
    for (let i = 0; i < this.grid; i++) {
      let lowX = i * this.w + this.xmargin;
      let highX = lowX + this.w;
      // console.log("lowX:", lowX, "highX", highX);
      for (let j = 0; j < this.grid; j++) {
        let lowY = j * this.w + this.ymargin;
        let highY = lowY + this.w;
        // console.log("lowY:", lowY, "highY:", highY);
        if (
          mouseX >= lowX &&
          mouseX <= highX &&
          mouseY >= lowY &&
          mouseY <= highY
        ) {
          console.log("bye");
          this.x = i;
          this.y = j;
        }
      }
    }
  }

  moveRight() {
    if (this.x >= this.grid - 1) {
      this.x = 0;
    } else {
      this.x += 1;
    }
  }

  moveLeft() {
    if (this.x <= 0) {
      this.x = this.grid - 1;
    } else {
      this.x -= 1;
    }
  }

  moveUp() {
    if (this.y <= 0) {
      this.y = this.grid - 1;
    } else {
      this.y -= 1;
    }
  }

  moveDown() {
    if (this.y >= this.grid - 1) {
      this.y = 0;
    } else {
      this.y += 1;
    }
  }
}
