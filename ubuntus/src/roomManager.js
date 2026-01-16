const dbHelpers = require('./dbHelpers');
const GameController = require('./game/GameController');

class RoomManager {
    constructor(io, dbConnection) {
        this.io = io;
        this.dbConnection = dbConnection;
        
        // Salas activas en memoria
        // { roomId: { id, name, players: [], viewers: [], status, gameController } }
        this.activeRooms = new Map();
        
        // Usuarios conectados
        // { socketId: { userId, username, currentRoom, isViewer } }
        this.connectedUsers = new Map();
    }

    // GESTIÓN DE USUARIOS

    // Helper para serializar roomData de forma segura (sin referencias circulares)
    serializeRoomData(room) {
        return {
            id: room.id,
            name: room.name,
            players: room.players.map(p => ({
                socketId: p.socketId,
                userId: p.userId,
                username: p.username,
                isReady: p.isReady
            })),
            viewers: room.viewers.map(v => ({
                socketId: v.socketId,
                userId: v.userId,
                username: v.username
            })),
            status: room.status
        };
    }

    registerUser(socketId, userId, username) {
        this.connectedUsers.set(socketId, {
            userId: userId,
            username: username,
            currentRoom: null,
            isViewer: false
        });
        console.log(`Usuario conectado: ${username} (${socketId})`);
    }

    disconnectUser(socketId) {
        const user = this.connectedUsers.get(socketId);
        if (user) {
            // Si estaba en una sala con juego activo, NO sacarlo (permitir reconexión)
            if (user.currentRoom) {
                const room = this.activeRooms.get(user.currentRoom);
                
                if (room && room.status === 'playing') {
                    console.log(`${user.username} desconectado temporalmente (juego en curso en sala ${user.currentRoom})`);
                    // NO llamar a leaveRoom, mantener en sala
                } else {
                    // Sala en espera o no existe, sí sacarlo
                    this.leaveRoom(socketId, user.currentRoom);
                }
            }
            
            console.log(`Usuario desconectado: ${user.username} (${socketId})`);
            this.connectedUsers.delete(socketId);
        }
    }

    getUser(socketId) {
        return this.connectedUsers.get(socketId);
    }

    // GESTIÓN DE SALAS

    async createRoom(socketId, roomName) {
        const user = this.getUser(socketId);
        
        if (!user) {
            return { status: 'error', message: 'User not found' };
        }

        try {
            const result = await dbHelpers.createGameRoom(
                this.dbConnection,
                roomName,
                user.userId
            );

            if (result.status === 'success') {
                const roomData = {
                    id: result.roomId,
                    name: roomName,
                    players: [
                        {
                            socketId: socketId,
                            userId: user.userId,
                            username: user.username,
                            isReady: false
                        }
                    ],
                    viewers: [], // Array, no Set
                    status: 'waiting',
                    gameController: null
                };

                this.activeRooms.set(result.roomId, roomData);
                
                const socket = this.io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.join(`room_${result.roomId}`);
                }
                user.currentRoom = result.roomId;

                console.log(`Sala creada: ${roomName} (ID: ${result.roomId})`);
                this.broadcastRoomsList();

                return {
                    status: 'success',
                    roomId: result.roomId,
                    roomData: this.serializeRoomData(roomData)
                };
            }

            return result;
        } catch (error) {
            console.error('Error creando sala:', error);
            return { status: 'error', message: 'Failed to create room' };
        }
    }

    async joinRoomAsPlayer(socketId, roomId) {
        const user = this.getUser(socketId);
        
        if (!user) {
            return { status: 'error', message: 'User not found' };
        }

        const room = this.activeRooms.get(roomId);
        
        if (!room) {
            return { status: 'error', message: 'Room not found' };
        }

        // PERMITIR RECONEXIÓN: Si el juego está en curso y el usuario era parte de la sala
        const existingPlayer = room.players.find(p => p.userId === user.userId);
        const isPlaying = room.status === 'playing';
        
        if (isPlaying && existingPlayer) {
            console.log(`${user.username} reconectándose a sala ${roomId} en curso`);
            
            // Actualizar socketId del jugador
            existingPlayer.socketId = socketId;
            
            // Usuario se une a la sala de Socket.IO
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
                socket.join(`room_${roomId}`);
            }
            user.currentRoom = roomId;
            
            // Enviar estado actual del juego
            if (room.gameController) {
                room.gameController.broadcastGameState();
            }
            
            return {
                status: 'success',
                roomData: this.serializeRoomData(room),
                reconnected: true
            };
        }

        if (room.status !== 'waiting') {
            return { status: 'error', message: 'Room is not available' };
        }

        if (room.players.length >= 2) {
            return { status: 'error', message: 'Room is full' };
        }

        try {
            const result = await dbHelpers.joinGameRoom(
                this.dbConnection,
                roomId,
                user.userId
            );

            if (result.status === 'success') {
                room.players.push({
                    socketId: socketId,
                    userId: user.userId,
                    username: user.username,
                    isReady: false
                });

                const socket = this.io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.join(`room_${roomId}`);
                }
                user.currentRoom = roomId;

                console.log(`${user.username} se unió a la sala ${roomId}`);

                this.io.to(`room_${roomId}`).emit('playerJoined', {
                    player: room.players[room.players.length - 1],
                    roomData: this.serializeRoomData(room)
                });

                this.broadcastRoomsList();

                return {
                    status: 'success',
                    roomData: this.serializeRoomData(room)
                };
            }

            return result;
        } catch (error) {
            console.error('Error uniéndose a sala:', error);
            return { status: 'error', message: 'Failed to join room' };
        }
    }

    // MÉTODO CORREGIDO: joinRoomAsViewer
    joinRoomAsViewer(socketId, roomId) {
        const user = this.getUser(socketId);
        
        if (!user) {
            return { status: 'error', message: 'User not authenticated' };
        }

        const room = this.activeRooms.get(roomId);
        
        if (!room) {
            return { status: 'error', message: 'Room not found' };
        }

        // Verificar si ya es viewer
        const alreadyViewer = room.viewers.find(v => v.socketId === socketId);
        if (alreadyViewer) {
            return { status: 'error', message: 'Already viewing this room' };
        }

        // Añadir como viewer
        room.viewers.push({
            socketId: socketId,
            userId: user.userId,
            username: user.username
        });
        
        user.currentRoom = roomId;
        user.isViewer = true;

        // Unir al socket a la room
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
            socket.join(`room_${roomId}`);
        }

        console.log(`${user.username} se unió como espectador a sala ${roomId}`);

        // IMPORTANTE: Si hay un juego activo, enviar gameInit al espectador
        if (room.gameController) {
            console.log(`Enviando gameInit al espectador ${user.username}`);
            room.gameController.sendGameInitToViewer(socketId);
            
            // Actualizar estado de pausa si es necesario
            const hasViewers = room.viewers.length > 0;
            room.gameController.togglePause(hasViewers);
        }

        // Notificar a otros en la sala
        this.io.to(`room_${roomId}`).emit('viewerJoined', {
            username: user.username,
            viewersCount: room.viewers.length
        });

        // Actualizar lista de salas para todos
        this.broadcastRoomsList();

        return {
            status: 'success',
            roomData: this.serializeRoomData(room)
        };
    }

    leaveRoom(socketId, roomId) {
        const user = this.getUser(socketId);
        const room = this.activeRooms.get(roomId);

        if (!room || !user) return;

        // Remover de jugadores
        const playerIndex = room.players.findIndex(p => p.socketId === socketId);
        if (playerIndex !== -1) {
            room.players.splice(playerIndex, 1);
            console.log(`${user.username} salió de la sala ${roomId} (jugador)`);
        }

        // Remover de espectadores
        const viewerIndex = room.viewers.findIndex(v => v.socketId === socketId);
        if (viewerIndex !== -1) {
            room.viewers.splice(viewerIndex, 1);
            console.log(`${user.username} salió de la sala ${roomId} (espectador)`);
            
            // Si no quedan viewers, pausar el juego
            if (room.gameController && room.viewers.length === 0) {
                room.gameController.togglePause(false);
            }
        }

        // Salir de la sala de Socket.IO
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
            socket.leave(`room_${roomId}`);
        }
        user.currentRoom = null;
        user.isViewer = false;

        console.log(Array.from(io.of("/").adapter.rooms.keys()));
        this.io.to(`room_${roomId}`).emit('userLeft',Array.from(io.of("/").adapter.rooms.keys()));

        // Si no quedan jugadores Y el juego NO está activo, eliminar la sala
        if (room.players.length === 0) {
            // Si hay un juego en curso, NO eliminar la sala (permitir reconexión)
            if (room.status === 'waiting' || room.status === 'finished') {
                if (room.gameController) {
                    room.gameController.stop();
                }
                this.activeRooms.delete(roomId);
                console.log(`Sala ${roomId} eliminada (sin jugadores)`);
            } else {
                console.log(`Sala ${roomId} - todos desconectados temporalmente (juego en curso)`);
            }
        }

        this.broadcastRoomsList();
    }

    // MÉTODO CORREGIDO: getRoomsList
    getRoomsList() {
        const rooms = [];

        this.activeRooms.forEach((room, roomId) => {
            rooms.push({
                id: parseInt(roomId),              
                name: room.name,
                status: room.status,
                playersCount: room.players.length,  
                viewersCount: room.viewers.length,  
                players: room.players.map(p => ({
                    username: p.username,
                    isReady: p.isReady
                }))
            });
        });

        console.log('📋 getRoomsList devolviendo:', JSON.stringify(rooms, null, 2));
        return rooms;
    }

    broadcastRoomsList() {
        const rooms = this.getRoomsList();
        console.log('📡 Broadcasting rooms list:', rooms.length, 'salas');
        this.io.emit('roomsList', rooms);
    }

    // GESTIÓN DE JUEGO

    setPlayerReady(socketId, isReady) {
        const user = this.getUser(socketId);
        if (!user || !user.currentRoom) {
            return { status: 'error', message: 'Not in a room' };
        }

        const room = this.activeRooms.get(user.currentRoom);
        if (!room) {
            return { status: 'error', message: 'Room not found' };
        }

        const player = room.players.find(p => p.socketId === socketId);
        if (!player) {
            return { status: 'error', message: 'Not a player' };
        }

        player.isReady = isReady;

        this.io.to(`room_${room.id}`).emit('playerReady', {
            username: player.username,
            isReady: isReady
        });

        // Si ambos jugadores están listos, iniciar juego
        if (room.players.length === 2 && room.players.every(p => p.isReady)) {
            this.startGame(room.id);
        }

        return { status: 'success' };
    }

    startGame(roomId) {
        const room = this.activeRooms.get(roomId);
        if (!room) return;

        room.status = 'playing';
        
        console.log(`🎮 Juego iniciado en sala ${roomId}`);

        // Crear GameController
        room.gameController = new GameController(
            roomId,
            room.players[0],
            room.players[1],
            this.io
        );

        // Verificar si hay viewers (solo pausar si NO hay)
        if (room.viewers.length === 0) {
            room.gameController.togglePause(false);
        }

        // Iniciar el juego
        room.gameController.start();

        // Notificar inicio del juego
        this.io.to(`room_${roomId}`).emit('gameStarted', {
            roomId: roomId,
            players: room.players
        });

        this.broadcastRoomsList();
    }

    // Procesar comando de juego de un jugador
    handleGameCommand(socketId, command) {
        const user = this.getUser(socketId);
        if (!user || !user.currentRoom || user.isViewer) {
            return { status: 'error', message: 'Invalid request' };
        }

        const room = this.activeRooms.get(user.currentRoom);
        if (!room || !room.gameController) {
            return { status: 'error', message: 'Game not active' };
        }

        // Enviar comando al GameController
        room.gameController.handlePlayerCommand(user.userId, command);

        return { status: 'success' };
    }

    getRoomData(roomId) {
        return this.activeRooms.get(roomId);
    }
}

module.exports = RoomManager;