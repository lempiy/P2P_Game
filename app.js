'use strict';

let connection,
    sendChannel,
    receiveChannel,
    pcConstraint,
    dataConstraint,
    isSecond,
    recieved;

var canvas;
var canvasContext;
var ballX = 50;
var ballSpeedX = 10;
var ballY = 30;
var ballSpeedY = 4;
var paddle1X = 0;
var paddle2X = 790;
var paddle1Y = 250;
var paddle2Y = 250;
var playerScore = 0;
var computerScore = 0;
const initialBallSpeedX = 10;
const initialBallSpeedY = 4;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
var hasUpdate = false;
var enemyY = 0;
var enemyVelocity = 0;
var ballRTCX = 50;
var ballRTCY = 30;
var ballSpeedRTCX = ballSpeedX;
var ballSpeedRTCY = ballSpeedY;
var velocity = 0;

window.addEventListener('storage', (event) => {
    if (event.key == "second") {
        let remoteDescr = JSON.parse(event.newValue)
        connection.setRemoteDescription(remoteDescr)
    } else if (event.key == "first_candidate") {
        console.log("Got first candidate")
        let cnd = JSON.parse(event.newValue)
        let candidate = new RTCIceCandidate({
            sdpMLineIndex: cnd.label,
            candidate: cnd.candidate
        });
        connection.addIceCandidate(candidate);
    } else if (event.key == "second_candidate") {
        console.log("Got second candidate")
        let cnd = JSON.parse(event.newValue)
        let candidate = new RTCIceCandidate({
            sdpMLineIndex: cnd.label,
            candidate: cnd.candidate
        });
        connection.addIceCandidate(candidate);
    }
})

const createConnection = () => {
    let servers = null;
    pcConstraint = null;
    dataConstraint = null;

    // local
    connection = new RTCPeerConnection(servers, pcConstraint)
    if (!localStorage.getItem("first")) {
        sendChannel = connection.createDataChannel('sendDataChannel', dataConstraint)
        sendChannel.onopen = () => {
            canvas = document.getElementById('gameCanvas');
            canvasContext = canvas.getContext('2d');
            var framesPerSecond = 30;
            setInterval(moveAndDrawEverything, 1000/framesPerSecond);

            canvas.addEventListener('mousemove',
              function(evt) {
                var mousePos = calculateMousePos(evt);
                if (mousePos.y > 0 && mousePos.y < canvas.width) {
                  velocity = mousePos.y-(PADDLE_HEIGHT/2) - paddle1Y;
                  paddle1Y = mousePos.y-(PADDLE_HEIGHT/2);
                }
            });
        }
        sendChannel.onclose = () => console.log("Send Channel Closed")
        sendChannel.onmessage = (e) => {
          var data = JSON.parse(event.data)
          console.log(data)
          enemyY = data.y
          enemyVelocity = data.enemyVelocity
          ballRTCX = data.ballX;
          ballRTCY = data.ballY;
          ballSpeedRTCX = data.ballSpeedX;
          ballSpeedRTCY = data.ballSpeedY;
          hasUpdate = true
        }
    }
    
    connection.onicecandidate = iceCallback;
    connection.ondatachannel = receiveChannelCallback;

    if (localStorage.getItem("first")) {
        isSecond = true
        let remoteDesc = JSON.parse(localStorage.getItem("first"))
        connection.setRemoteDescription(remoteDesc)
        connection.createAnswer().then(desc => {
            console.log("createAnswer")
            connection.setLocalDescription(desc)
            localStorage.setItem("second", JSON.stringify(desc.toJSON()))
        })

    } else {
        connection.createOffer().then(
            (desc) => {
                console.log("createOffer")
                connection.setLocalDescription(desc);
                localStorage.setItem("first", JSON.stringify(desc.toJSON()))
            }
        )
    }
}

const iceCallback = (event) => {
    console.log(event)
    if (event.candidate && !recieved) {
        recieved = true;
        if (localStorage.getItem("first_candidate")) {
            console.log("Paste second candidate")
            const first = JSON.parse(localStorage.getItem("first_candidate"))
            localStorage.setItem("second_candidate", JSON.stringify({
                type: 'candidate',
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            }))
            console.log("Receive first candidate")
            connection.addIceCandidate(new RTCIceCandidate({
                candidate: first.candidate
            }))
        } else {
            console.log("Paste first candidate")
            localStorage.setItem("first_candidate", JSON.stringify({
                type: 'candidate',
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            }))
        }
    }
}

const getChannel = () => {
  return isSecond ? receiveChannel : sendChannel
}

const receiveChannelCallback = (event) => {
    if (isSecond) {
        paddle1X = 790;
        paddle2X = 0;
        receiveChannel = event.channel;
        receiveChannel.onmessage = (event) => {
          var data = JSON.parse(event.data)
          enemyY = data.y
          enemyVelocity = data.enemyVelocity
          ballRTCX = data.ballX;
          ballRTCY = data.ballY;
          ballSpeedRTCX = data.ballSpeedX;
          ballSpeedRTCY = data.ballSpeedY;
          hasUpdate = true
        }
        receiveChannel.onclose = () => console.log("Receive Channel Closed")
        receiveChannel.onopen = () => {
            canvas = document.getElementById('gameCanvas');
            canvasContext = canvas.getContext('2d');
            var framesPerSecond = 30;
            setInterval(moveAndDrawEverything, 1000/framesPerSecond);

            canvas.addEventListener('mousemove',
              function(evt) {
                var mousePos = calculateMousePos(evt);
                if (mousePos.y > 0 && mousePos.y < canvas.width) {
                  velocity = mousePos.y-(PADDLE_HEIGHT/2) - paddle2Y;
                  paddle2Y = mousePos.y-(PADDLE_HEIGHT/2);
                }
            });
        }
    }
}

createConnection();

function calculateMousePos(evt) {
	var rect = canvas.getBoundingClientRect();
	var root = document.documentElement;
	var mouseX = evt.clientX - rect.left - root.scrollLeft;
	var mouseY = evt.clientY - rect.top - root.scrollTop;
	return {
		x:mouseX,
		y:mouseY
	};
}

function ballReset(){
  ballX = canvas.width/2;
  ballY = canvas.height/2;
  ballSpeedX = -initialBallSpeedX
  ballSpeedY = -initialBallSpeedY
}

function moveAndDrawEverything() {
  getChannel().send(JSON.stringify({
        y: paddle1Y, 
        velocity: velocity, 
        ballX: ballX, 
        ballY: ballY,
        ballSpeedX: ballSpeedX,
        ballSpeedY: ballSpeedY
     }
  ))
  moveEverything();
  drawEverything();
}

function computerMoves() {
  if (ballY > paddle2Y+PADDLE_HEIGHT/2) {
    paddle2Y += 4;
  } else {
    paddle2Y -= 4;
  }
}
var checkY = 0;
function enemyMoves() {
  if (hasUpdate) {
    if (isSecond) {
      paddle1Y = enemyY
    } else {
      paddle2Y = enemyY
    }
    
  } else {
    checkY = isSecond ? paddle1Y : paddle2Y;
    console.log("hasNotUp", paddle2Y)
    if ((checkY + enemyVelocity > 0) && (checkY + enemyVelocity < canvas.width)) {
      if (isSecond) {
        paddle1Y += enemyVelocity
      } else {
        paddle2Y += enemyVelocity
        hasUpdate = false
      }
    }
  }
  
}
var myY = paddle1Y;
var enemyY = paddle2Y;
function moveEverything() {
  enemyMoves()
  if (isSecond && hasUpdate) {
    console.log("sync", ballRTCX, ballRTCY)
    ballX = ballRTCX;
    ballY = ballRTCY;
    ballSpeedX = ballSpeedRTCX;
    ballSpeedY = ballSpeedRTCY;
    hasUpdate = false
  } else {
    console.log("no sync")
    ballX = ballX + ballSpeedX;
    ballY = ballY + ballSpeedY;
  }
  
  if (ballX < 0) {
    myY = isSecond ? paddle2Y : paddle1Y;
    enemyY = isSecond ? paddle1Y : paddle2Y;
    if (ballY > myY && ballY < myY+PADDLE_HEIGHT) {
      ballSpeedX = -ballSpeedX;
      var deltaY = ballY - (myY+PADDLE_HEIGHT/2)
      ballSpeedY = deltaY * 0.35
    } else {
      isSecond ? playerScore++ : computerScore++;
      ballReset();
    }
  }

  if (ballX > canvas.width) {
    if (ballY > enemyY && ballY < enemyY+PADDLE_HEIGHT) {
      ballSpeedX = -ballSpeedX;
      var deltaY = ballY - (enemyY+PADDLE_HEIGHT/2)
      ballSpeedY = deltaY * 0.35
    } else {
      isSecond ? computerScore++ : playerScore++;
      ballReset();
    }
  }

  if (ballY < 0) {
    ballSpeedY = -ballSpeedY;
  }
  if (ballY > canvas.height) {
    ballSpeedY = -ballSpeedY;
  }
}

function drawEverything() {
  // background
  colorRect(0,0,canvas.width,canvas.height,'black');
  // ball
  colorBall(ballX,ballY,10,'white');
  // left paddle
  colorRect(paddle1X,paddle1Y,PADDLE_WIDTH,PADDLE_HEIGHT,'white');
  // right paddle
  colorRect(paddle2X,paddle2Y,PADDLE_WIDTH,PADDLE_HEIGHT,'white');
  fillScore();
}

function fillScore(){
  canvasContext.fillText(playerScore, 100,100);
  canvasContext.fillText(computerScore, canvas.width-100,100);
}
function colorBall(centerX, centerY, radius, color) {
  canvasContext.fillStyle = color;
  canvasContext.beginPath();
  canvasContext.arc(centerX, centerY, radius,0,Math.PI*2, true);
  canvasContext.fill();
}

function colorRect(leftX, topY, height, width, color){
  canvasContext.fillStyle = color;
  canvasContext.fillRect(leftX, topY, height, width);
}