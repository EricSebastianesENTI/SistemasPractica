const express = require("express");

const app = express();

// Settings Section
app.set("port", process.env.PORT || 3000);
app.set("json spaces", 2);

// Middlewares
const morgan = require("morgan");
app.use(morgan("dev"));

// Express url work setup
app.use(express.urlencoded({ extended: false }));
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

const RoomManager = require('./roomManager');
const dbHelpers = require('./dbHelpers');

let roomManager = null;

function initializeRoomManager() {
    const bdd = app.get("bdd");
    if (bdd && !roomManager) {
        try {
            roomManager = new RoomManager(io, bdd);
            console.log("Room Manager inicializado correctamente");
            return true;
        } catch (error) {
            console.error("Error inicializando RoomManager:", error);
            return false;
        }
    }
    return false;
}

require("./bddSetup")(app);

app.on('dbReady', () => {
    console.log("Señal dbReady recibida - Inicializando RoomManager...");
    initializeRoomManager();
});

setTimeout(() => {
    if (!roomManager) {
        console.log("Timeout alcanzado - Intentando inicializar RoomManager...");
        if (!initializeRoomManager()) {
            console.log("RoomManager no pudo inicializarse - BD no disponible");
            console.log("El servidor seguirá funcionando pero sin funcionalidad de salas");
        }
    }
}, 3000);

app.use(require("./routes/_routes"));


game = [];
io.on("connection", (socket) => {
    var address = socket.request.connection;
    console.log("Socket connected --> " + address.remoteAddress + ":" + address.remotePort);

    if (!roomManager) {
        console.log("Cliente conectado pero RoomManager no está listo");
        socket.emit("error", {
            message: "Server is initializing, please wait and try again...",
            code: "SERVER_NOT_READY"
        });
    }

    socket.on("authenticate", async (data) => {
        console.log("Intento de autenticación:", data);

        if (!roomManager) {
            console.log("Autenticación fallida - RoomManager no disponible");
            socket.emit("error", { message: "Server not ready" });
            return;
        }

        const { userId, username } = data;

        roomManager.registerUser(socket.id, userId, username);

        // Enviar lista de salas actual
        socket.emit("roomsList", roomManager.getRoomsList());

        console.log("Usuario autenticado:", username);
        socket.emit("authenticated", {
            status: "success",
            message: "Authenticated successfully"
        });
    });


    socket.on("createRoom", async (data) => {
        if (!roomManager) {
            socket.emit("error", { message: "Server not ready" });
            return;
        }
        
        const { roomName } = data;
        console.log("Creando sala:", roomName);
        const result = await roomManager.createRoom(socket.id, roomName);

        socket.emit("roomCreated", result);
    });

    socket.on("joinRoomAsPlayer", async (data) => {

        const { roomId } = data;
        console.log("Unirse como jugador a sala:", roomId);
        const result = await roomManager.joinRoomAsPlayer(socket.id, roomId);

        socket.emit("roomJoined", result);
        if (game.length == 0)
        {

        }
    });

    socket.on("joinRoomAsViewer", (name) => {
        socket.join(name);
        socket.emit("roomJoined", true);
        game.push(data);
    });
    socket.on("leaveRoomAsViewer", (name) => {
        socket.leave(name);
        socket.emit("roomLeft", true);
        
        let index = game.indexOf(name);

        if (index !== -1) {
            game.splice(index, 1);
        }
    });

    socket.on("leaveRoom", (data) => {
        if (!roomManager) return;

        const { roomId } = data;
        console.log("Salir de sala:", roomId);
        roomManager.leaveRoom(socket.id, roomId);

        socket.emit("roomLeft", { status: "success" });
    });

    socket.on("getRooms", () => {
        if (!roomManager) {
            socket.emit("roomsList", []);
            return;
        }

        const rooms = roomManager.getRoomsList();
        console.log(`📋 Enviando ${rooms.length} salas`);
        
        // Enviar array de nombres para Unity
        const roomNames = rooms.map(r => r.name);
        socket.emit("roomsList", roomNames);
    });

    socket.on("setReady", (data) => {
        if (!roomManager) return;

        const { isReady } = data;
        console.log("Cambio de estado ready:", isReady);
        const result = roomManager.setPlayerReady(socket.id, isReady);

        socket.emit("readyStatus", result);
    });

    socket.on("gameCommand", (data) => {
        if (!roomManager) return;

        const { command } = data;
        const result = roomManager.handleGameCommand(socket.id, command);

        if (result.status === 'error') {
            socket.emit("error", result);
        }
    });

    socket.on("chatMessage", (data) => {
        if (!roomManager) return;

        const user = roomManager.getUser(socket.id);
        if (!user || !user.currentRoom) return;

        const { message } = data;

        io.to(`room_${user.currentRoom}`).emit("chatMessage", {
            userId: user.userId,
            username: user.username,
            message: message,
            timestamp: Date.now()
        });

        console.log(`[${user.username}]: ${message}`);
    });

    socket.on("disconnect", () => {
        console.log("Socket disconnected: " + address.remoteAddress + ":" + address.remotePort);

        if (roomManager) {
            roomManager.disconnectUser(socket.id);
        }
    });
});

server.listen(app.get("port"), () => {
    const ip = ipHelper.address();
    const port = app.get("port");
    const url = "http://" + ip + ":" + port + "/";
    console.log("\n" + "=".repeat(50));
    console.log("Servidor arrancado en: " + url);
    console.log("Socket.IO configurado y listo");
    console.log("=".repeat(50) + "\n");
});