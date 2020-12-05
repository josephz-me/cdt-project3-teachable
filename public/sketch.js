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
    // console.log(key);
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
    rect(
      drawnPlayer.x * drawnPlayer.w + drawnPlayer.xmargin,
      drawnPlayer.y * drawnPlayer.w + drawnPlayer.ymargin,
      w,
      w
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
    console.log(pixelValue);
    video.size(320 / pixelValue, 240 / pixelValue);
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

// The model recognizing a sound will trigger this event
let previousLabel;

function gotResult(error, results) {
  if (error) {
    console.error(error);
    return;
  }
  // The results are in an array ordered by confidence.
  console.log(results);
  if (results[0].confidence > 0.75) {
    label = results[0].label;

    previousLabel = label;
    console.log(label);
    if (label === "Clapping") {
      pixelValue = 150;
      $(".clapping").addClass("highlighted");
      $(".highlighted").removeClass("highlighted");
    } else if (label === "crumpling") {
      pixelValue = 20;
      $(".knocking").addClass("highlighted");
      $(".highlighted").removeClass("highlighted");
    } else if (label === "Paper Crumpling") {
      pixelValue = 20;
      $(".crumpling").addClass("highlighted");
      $(".highlighted").removeClass("highlighted");
    }
  } else {
    label = previousLabel;
  }
}
