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
            if (user.currentRoom) {
                this.leaveRoom(socketId, user.currentRoom);
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
                    viewers: [],
                    status: 'waiting',
                    gameController: null  // Se crea cuando empiezan a jugar
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
                    roomData: roomData
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
                    roomData: room
                });

                this.broadcastRoomsList();

                return {
                    status: 'success',
                    roomData: room
                };
            }

            return result;
        } catch (error) {
            console.error('Error uniéndose a sala:', error);
            return { status: 'error', message: 'Failed to join room' };
        }
    }

    joinRoomAsViewer(socketId, roomId) {
        const user = this.getUser(socketId);
        
        if (!user) {
            return { status: 'error', message: 'User not found' };
        }

        const room = this.activeRooms.get(roomId);
        
        if (!room) {
            return { status: 'error', message: 'Room not found' };
        }

        room.viewers.push({
            socketId: socketId,
            userId: user.userId,
            username: user.username
        });

        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
            socket.join(`room_${roomId}`);
        }
        user.currentRoom = roomId;
        user.isViewer = true;

        console.log(`${user.username} está viendo la sala ${roomId}`);

        this.io.to(`room_${roomId}`).emit('viewerJoined', {
            viewer: user.username,
            viewersCount: room.viewers.length
        });

        // Si el juego estaba pausado por falta de viewers, reanudarlo
        if (room.gameController) {
            room.gameController.togglePause(true);
        }

        return {
            status: 'success',
            roomData: room
        };
    }

    leaveRoom(socketId, roomId) {
        const user = this.getUser(socketId);
        const room = this.activeRooms.get(roomId);

        if (!room || !user) return;

        // Si era jugador
        const playerIndex = room.players.findIndex(p => p.socketId === socketId);
        if (playerIndex !== -1) {
            room.players.splice(playerIndex, 1);
            console.log(`${user.username} salió de la sala ${roomId} (jugador)`);
            
            // Si había un juego en curso, terminarlo
            if (room.gameController) {
                room.gameController.stop();
                room.gameController = null;
                room.status = 'waiting';
            }
        }

        // Si era espectador
        const viewerIndex = room.viewers.findIndex(v => v.socketId === socketId);
        if (viewerIndex !== -1) {
            room.viewers.splice(viewerIndex, 1);
            console.log(`${user.username} salió de la sala ${roomId} (espectador)`);
            
            // Si no quedan viewers, pausar el juego
            if (room.gameController && room.viewers.length === 0) {
                room.gameController.togglePause(false);
            }
        }

        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
            socket.leave(`room_${roomId}`);
        }
        user.currentRoom = null;
        user.isViewer = false;

        this.io.to(`room_${roomId}`).emit('userLeft', {
            username: user.username,
            roomData: room
        });

        // Si no quedan jugadores, eliminar la sala
        if (room.players.length === 0) {
            if (room.gameController) {
                room.gameController.stop();
            }
            this.activeRooms.delete(roomId);
            console.log(`Sala ${roomId} eliminada (sin jugadores)`);
        }

        this.broadcastRoomsList();
    }

    getRoomsList() {
        const rooms = [];
        
        this.activeRooms.forEach((room, roomId) => {
            rooms.push({
                id: roomId,
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

        return rooms;
    }

    broadcastRoomsList() {
        const rooms = this.getRoomsList();
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
        
        console.log(`Juego iniciado en sala ${roomId}`);

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