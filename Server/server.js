
const WebSocket = require("ws");
const express = require("express");
const jwt = require('jsonwebtoken');
const url = require('url');
const path = require("path");
const Game = require('./Game.js'); // Import Game class
const app = express()
const port = process.env.PORT || 3000

// Define the secret to be used in the JWT signing algorithm.
const jwtSecret = "example-secret"

const players = [];
var game;

app.use("/", express.static(path.resolve(__dirname, "../client")))

app.post('/login', function (req, res) {
    // console.log(JSON.stringify(req.headers));
    console.log("User logged in with Username: " + req.headers.username)
    res.send(getUserToken(req))


})

const myServer = app.listen(port)       // regular http server using node express which serves the webpage 

myServer.on('upgrade', async function upgrade(request, socket, head) {      //handling upgrade(http to websocket) event   
    //emit connection when request accepted
    wsServer.handleUpgrade(request, socket, head, function done(ws) {
        wsServer.emit('connection', ws, request);
    });
});

//Starting websocket server
const wsServer = new WebSocket.Server({
    noServer: true,
    clientTracking: true
})                                      

wsServer.on("connection", function (ws, req) {    // what should a websocket do on connection
    console.log("Connection opened...(Verifying token)")
    //get token from user and validate
    var token = url.parse(req.url, true).query.token;

    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            ws.close();
            console.log("JWT Verification failed")
        } else {
            if (players.length < 2) {
                newPlayerConnected(decoded, token, ws);
                updatePlayerCount();
            } else {
                console.log("Too many players, closing connection.")
                ws.close();
            }
        }
    })

    ws.on("message", function (msg) {        // what to do on message event
        var jsonString = JSON.parse(msg);

        // TODO: CHECK FOR WIN IF GAME IS STARTED:

        //Checking if the message is a click message: 
        if (jsonString.type == "klikk") {

            var user = players.find(element => element.ws === ws);
            // If game exists and it has started
            if (game != undefined && game.gameStarted) {
                // If it is this players turn do this
                if (players.indexOf(user) == game.playerTurn) {
                    //Checking if tile has already been clicked
                    if (game.gameState[jsonString.text] == 0) {
                        game.gameState[jsonString.text] = players.indexOf(user) + 1;
                        //Checking if game is won or draw
                        if (game.isWin()) {
                            gameWon();
                        }
                        else if (game.isDraw()) {
                          gameDraw();
                        }
                        // IF game is still going change playerturn.
                        else{
                            game.playerTurn = game.playerTurn ? 0 : 1;
                            var msg = {
                                type: "gamestate",
                                playerturn: game.playerTurn,
                                gamestate: game.gameState,
                                gamestarted: game.gameStarted,
                                iswin: false
                            }
                            sendMsgAll(msg, players);
                        }
                    }
                    else {
                        console.log("TILE ALREADY CLICKED")
                    }
                }
            }
        }
        //Checking if players are ready
        else if (jsonString.type == "playerready") {
            var user = players.find(element => element.ws === ws);

            if (jsonString.ready) {
                user.ready = 1;
                console.log(user.username + " is ready: " + user.ready);

            } else {
                user.ready = 0;
                console.log(user.username + " is not ready: " + user.ready);
            }
            readyMsg();

            // Start Game if there are two players and both of them are ready
            if (players.length >= 2) {
                if (players[0].ready && players[1].ready) {
                    // console.log("starting Game");
                    game = new Game(players);
                    game.start();
                }
            }
        }
        else {
            console.log("WRONG FORMAT MESSAGE")
        }

    })

    ws.on("close", function () {
        console.log("Conenction closed")
        for (let i = 0; i < players.length; i++) {
            players[i].ready = 0;
        }
        if (game != undefined) {
            game.reset();
        }
        sendMsgAll({ type: "reset" }, players);
        removeClosedConnections(ws);
        updatePlayerCount();
    })
})

// Function for generating JWT token based on username
const getUserToken = (req) => {
    return jwt.sign({ "username": req.headers.username }, jwtSecret, { expiresIn: 900 })
}
//Send message to newly connected player.(MAYBE NOT NECCESARY)
const newPlayerConnected = (decoded, token, ws) => {

    console.log("Connection verified.");
    var wsUsername = decoded.username;

    var newPlayer = {
        "token": token,
        "ws": ws,
        "username": wsUsername,
        "ready": 0
    }

    players.push(newPlayer);

    var msg = {
        type: "connected",
        text: "connected",
        numberofplayers: (players.length),
        username: wsUsername
    };
    ws.send(JSON.stringify(msg));

}
//Message for updating playercount
const updatePlayerCount = () => {
    var allUsers = "";
    for (let i = 0; i < players.length; i++) {
        allUsers = allUsers + "," + players[i].username;
    }
        var msg = {
            type: "updateplayercount",
            text: "updateplayercount",
            numberofplayers: players.length,
            allusers: allUsers
        }
        sendMsgAll(msg, players);
}
// Remove all players with closed connections from player list
const removeClosedConnections = (ws) => {
    for (let i = players.length - 1; i >= 0; i--) {
        if (players[i].ws.readyState == ws.OPEN) {
            console.log("Player: " + players[i].username + " is connected")
        }
        else {
            console.log("Player: " + players[i].username + " disconnected")
            players[i].ws.close();
            players.splice(i, 1);
        }
    }
}
//Function for sending a message to all connected players
const sendMsgAll = (msg, players) => {
    for (let i = 0; i < players.length; i++) {
        players[i].ws.send(JSON.stringify(msg))
    }
}
//Sending message to players when readystatus has changed
const readyMsg = () => {
    var playersReady = [0, 0];
    for (let index in players) {
        playersReady[index] = players[index].ready;
    }
    var msg = {
        type: "readystate",
        ready: playersReady
    }
    sendMsgAll(msg, players);
}
// Function for resetting gameboard and tell clients when game is won
const gameWon = () => {
    console.log("GAME IS WON")
    game.gameStarted = 0;
    for (let i = 0; i < players.length; i++) {
        players[i].ready = 0;
    }
    readyMsg();
    var msg = {
        type: "gamestate",
        playerturn: game.playerTurn,
        gamestate: game.gameState,
        gamestarted: game.gameStarted,
        iswin: true
    }
    sendMsgAll(msg, players);
}
// Function for resetting gameboard and tell clients when game is draw
const gameDraw = () => {
    console.log("GAME IS DRAW")
    game.gameStarted = 0;
    for (let i = 0; i < players.length; i++) {
        players[i].ready = 0;
    }
    readyMsg();
    var msg = {
        type: "gamestate",
        playerturn: game.playerTurn,
        gamestate: game.gameState,
        gamestarted: game.gameStarted,
        iswin: false,
        isdraw: true
    }
    sendMsgAll(msg, players);
}

