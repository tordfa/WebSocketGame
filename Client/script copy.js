//Websocket variables
// const url = "ws://localhost:9876/myWebsocket"
const url = "ws://localhost:9876/"
const loginUrl = "http://localhost:9876/login"

// Creating Websocket server. (Implement reverse proxy?)
var mywsServer = new WebSocket(url);

//DOM Elements
const myMessages = document.getElementById("messages")
const myInput = document.getElementById("message")
const connectBtn = document.getElementById("connect")
const gamecontainer = document.getElementsByClassName("gameContainer")[0]
const tiles = document.getElementsByClassName("gameTile");
const loginField = document.getElementById("login");
const loginInfo = document.getElementById("loginInfo");


// Adding eventlisteners to HTML elements
for(let tile of tiles){
    tile.addEventListener("click", () => {klikkTile(tile)});
}

// Fucntion for sending information to server whe tile is clicked
function klikkTile(tile){
    //Debug
    console.log("(ClickFunction)KLIKKK: " + tile.innerText)
    //DEBUG END

    // Send Click information to Server
    var msg = {
        type: "klikk",
        text: tile.innerText,  
    };
    mywsServer.send(JSON.stringify(msg));
}

// Login function
function login(){
    // Defining headers to be sent
    var headers = new Headers({
        'Content-Type': 'text/json',
        'username': loginField.value
    });

    let initObject = {
        method: 'POST', headers: headers,
    };
    // If the loginField is empty: error
    if(loginField.value == ''){
        console.log("Please Enter Username")
        loginInfo.innerText = "Please enter username!"
    }
    else{
        fetch(loginUrl, initObject)
            .then(function (response) {
                console.log("JIPPI")
                loginInfo.innerText = ""
                return response.text()
            })
            .then(function(token){
                console.log(token)
            })
            .catch(function(err){
                console.log("WRONG: ", err);
                loginInfo.innerText = "Something went wrong!"
            });
    }

}


// Add eventlistener to login button
document.getElementById("submit").addEventListener("click",() => {login()})

//Do this when connection is open:
mywsServer.onopen = function() {
    console.log(gamecontainer)
    gamecontainer.style.visibility = "visible"
}

//handling messages recieved from server
mywsServer.onmessage = function(event) {

    // Parsing string recieved from server into JSON
    var jsonData = JSON.parse(event.data);
    console.log(jsonData.text);

    // If the message recieved is a click message
    if(jsonData.type == "klikkSvar"){
        //DEBUG
        console.log("Klikksvar")
        console.log(tiles[jsonData.text]);
        tiles[jsonData.text].style.color = "red";
        //DEBUG END

    }
}