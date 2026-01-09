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

// Importar RoomManager y helpers
const RoomManager = require('./roomManager');
const dbHelpers = require('./dbHelpers');

// Variable global para RoomManager
let roomManager = null;

// Función para inicializar RoomManager cuando la BD esté lista
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

// Configurar base de datos
require("./bddSetup")(app);

// Escuchar cuando la BD esté lista
app.on('dbReady', () => {
    console.log("Señal dbReady recibida - Inicializando RoomManager...");
    initializeRoomManager();
});

// Backup: Intentar inicializar después de un delay (por si el evento no funciona)
setTimeout(() => {
    if (!roomManager) {
        console.log("Timeout alcanzado - Intentando inicializar RoomManager...");
        if (!initializeRoomManager()) {
            console.log("RoomManager no pudo inicializarse - BD no disponible");
            console.log("El servidor seguirá funcionando pero sin funcionalidad de salas");
        }
    }
}, 3000);

// Rutas
app.use(require("./routes/_routes"));

// Configurar Socket.IO
io.on("connection", (socket) => {
    var address = socket.request.connection;
    console.log("Socket connected --> " + address.remoteAddress + ":" + address.remotePort);

    // Verificar que RoomManager esté listo
    if (!roomManager) {
        console.log("Cliente conectado pero RoomManager no está listo");
        socket.emit("error", { 
            message: "Server is initializing, please wait and try again...",
            code: "SERVER_NOT_READY"
        });
    }

    // AUTENTICACIÓN
    
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

    // GESTIÓN DE SALAS

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
        if (!roomManager) {
            socket.emit("error", { message: "Server not ready" });
            return;
        }

        const { roomId } = data;
        console.log("Unirse como jugador a sala:", roomId);
        const result = await roomManager.joinRoomAsPlayer(socket.id, roomId);
        
        socket.emit("roomJoined", result);
    });

    socket.on("joinRoomAsViewer", (data) => {
        if (!roomManager) {
            socket.emit("error", { message: "Server not ready" });
            return;
        }

        const { roomId } = data;
        console.log("Unirse como espectador a sala:", roomId);
        const result = roomManager.joinRoomAsViewer(socket.id, roomId);
        
        socket.emit("roomJoined", result);
    });

    socket.on("leaveRoom", (data) => {
        if (!roomManager) return;

        const { roomId } = data;
        console.log("🚪 Salir de sala:", roomId);
        roomManager.leaveRoom(socket.id, roomId);
        
        socket.emit("roomLeft", { status: "success" });
    });

    socket.on("getRooms", () => {
        if (!roomManager) {
            socket.emit("roomsList", []);
            return;
        }

        console.log("Obteniendo lista de salas");
        socket.emit("roomsList", roomManager.getRoomsList());
    });

    socket.on("setReady", (data) => {
        if (!roomManager) return;

        const { isReady } = data;
        console.log("Cambio de estado ready:", isReady);
        const result = roomManager.setPlayerReady(socket.id, isReady);
        
        socket.emit("readyStatus", result);
    });

    // COMANDOS DE JUEGO

    socket.on("gameCommand", (data) => {
        if (!roomManager) return;

        const { command } = data;
        // console.log("Comando de juego:", command); // Comentado para no spamear logs
        
        const result = roomManager.handleGameCommand(socket.id, command);
        
        if (result.status === 'error') {
            socket.emit("error", result);
        }
    });

    // DESCONEXIÓN
    
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