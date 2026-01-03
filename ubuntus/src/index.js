const express = require("express");

const app = express();

// Settings Section
app.set("port", process.env.PORT || 3000);
app.set("json spaces", 2);

// Middlewares
const morgan = require("morgan");
app.use(morgan("dev"));

// Express url work setup
app.use(express.urlencoded({extended: false}));
app.use(express.json());

const path = require("path");
app.use(express.static(path.join(__dirname, "public")))

// Auxiliar class
const ipHelper = require("ip");

const http = require("http");
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.set("io", io);

// Configurar base de datos
require("./bddSetup")(app);

// Rutas
app.use(require("./routes/_routes"));

// Configurar Socket.IO AQUÍ (no en chat.js)
const messageList = [];

io.on("connection", (socket) => {
    var address = socket.request.connection;
    console.log("Socket connected with ip:port --> " + address.remoteAddress + ":" + address.remotePort);

    socket.on("ClientRequestMessageListToServer", () => {
        console.log("Cliente solicitó lista de mensajes");
        socket.emit("ServerResponseRequestMessageListToServer", messageList);
    });

    socket.on("ClientMessageToServer", (messageData) => {
        console.log("Mensaje recibido:", messageData);
        
        if (!messageData.username || !messageData.text) {
            console.log("Mensaje con formato incorrecto");
            return;
        }

        messageList.push(messageData);
        io.emit("ServerMessageToClient", messageData);
    });

    socket.on("UnityMessage", (text) => {
        console.log("Mensaje de Unity recibido:", text);
        
        var messageData = {
            username: "UnityUser",
            text: text
        };
        
        messageList.push(messageData);
        io.emit("ServerMessageToClient", messageData);
    });

    socket.on("LoginRequest", (loginData) => {
        console.log("Login request:", loginData);
        
        var bddConnection = app.get("bdd");

        if (!bddConnection) {
            console.error("BDD no conectada");
            socket.emit("LoginResponse", {
                status: "error",
                message: "Database connection error"
            });
            return;
        }
        
        var query = 'SELECT id FROM User WHERE username = "' + loginData.username + '" AND password = "' + loginData.password + '"';
        
        bddConnection.query(query, (err, result, fields) => {
            var loginResponseData = {};
            
            if (err) {
                console.error("Database error:", err);
                loginResponseData.status = "error";
                loginResponseData.message = "Database error";
                socket.emit("LoginResponse", loginResponseData);
                return;
            }

            if (result.length <= 0) {
                console.log("User or password Incorrect");
                loginResponseData.status = "error";
                loginResponseData.message = "User or password Incorrect";
                socket.emit("LoginResponse", loginResponseData);
                return;
            }

            loginResponseData.status = "success";
            loginResponseData.id = result[0].id;

            socket.emit("LoginResponse", loginResponseData);
            console.log("Login successful:", loginResponseData);
        });
    });

    socket.on("disconnect", () => {
        console.log("Socket disconnected: " + address.remoteAddress + ":" + address.remotePort);
    });
});

server.listen(app.get("port"), () => {
    const ip = ipHelper.address();
    const port = app.get("port");
    const url = "http://" + ip + ":" + port + "/";
    console.log("Servidor arrancado en la url: " + url);
    console.log("Socket.IO configurado y listo");
});