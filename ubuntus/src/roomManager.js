const dbHelpers = require('./dbHelpers');

class RoomManager {
    constructor(io, dbConnection) {
        this.io = io;
        this.dbConnection = dbConnection;
        
        // Salas activas en memoria
        // { roomId: { id, name, players: [], viewers: [], status, gameState } }
        this.activeRooms = new Map();
        
        // Usuarios conectados
        // { socketId: { userId, username, currentRoom } }
        this.connectedUsers = new Map();
    }

    // GESTIÓN DE USUARIOS

    // Registrar usuario conectado
    registerUser(socketId, userId, username) {
        this.connectedUsers.set(socketId, {
            userId: userId,
            username: username,
            currentRoom: null
        });
        console.log(`Usuario conectado: ${username} (${socketId})`);
    }

    // Desconectar usuario
    disconnectUser(socketId) {
        const user = this.connectedUsers.get(socketId);
        if (user) {
            // Si estaba en una sala, sacarlo
            if (user.currentRoom) {
                this.leaveRoom(socketId, user.currentRoom);
            }
            
            console.log(`Usuario desconectado: ${user.username} (${socketId})`);
            this.connectedUsers.delete(socketId);
        }
    }

    // Obtener usuario por socketId
    getUser(socketId) {
        return this.connectedUsers.get(socketId);
    }

    // GESTIÓN DE SALAS

    // Crear una nueva sala
    async createRoom(socketId, roomName) {
        const user = this.getUser(socketId);
        
        if (!user) {
            return { status: 'error', message: 'User not found' };
        }

        try {
            // Crear en la base de datos
            const result = await dbHelpers.createGameRoom(
                this.dbConnection,
                roomName,
                user.userId
            );

            if (result.status === 'success') {
                // Crear en memoria
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
                    gameState: null
                };

                this.activeRooms.set(result.roomId, roomData);
                
                // Usuario se une a la sala de Socket.IO
                const socket = this.io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.join(`room_${result.roomId}`);
                }
                user.currentRoom = result.roomId;

                console.log(`🏠 Sala creada: ${roomName} (ID: ${result.roomId})`);

                // Notificar a todos que hay una nueva sala
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

    // Unirse a una sala como jugador
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
            // Actualizar en base de datos
            const result = await dbHelpers.joinGameRoom(
                this.dbConnection,
                roomId,
                user.userId
            );

            if (result.status === 'success') {
                // Añadir jugador a la sala
                room.players.push({
                    socketId: socketId,
                    userId: user.userId,
                    username: user.username,
                    isReady: false
                });

                room.status = 'playing';

                // Usuario se une a la sala de Socket.IO
                const socket = this.io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.join(`room_${roomId}`);
                }
                user.currentRoom = roomId;

                console.log(`${user.username} se unió a la sala ${roomId}`);

                // Notificar a todos en la sala
                this.io.to(`room_${roomId}`).emit('playerJoined', {
                    player: room.players[room.players.length - 1],
                    roomData: room
                });

                // Actualizar lista de salas para todos
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

    //  Unirse a una sala como espectador
    joinRoomAsViewer(socketId, roomId) {
        const user = this.getUser(socketId);
        
        if (!user) {
            return { status: 'error', message: 'User not found' };
        }

        const room = this.activeRooms.get(roomId);
        
        if (!room) {
            return { status: 'error', message: 'Room not found' };
        }

        // Añadir como espectador
        room.viewers.push({
            socketId: socketId,
            userId: user.userId,
            username: user.username
        });

        // Usuario se une a la sala de Socket.IO
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
            socket.join(`room_${roomId}`);
        }
        user.currentRoom = roomId;

        console.log(`${user.username} está viendo la sala ${roomId}`);

        // Notificar a todos en la sala
        this.io.to(`room_${roomId}`).emit('viewerJoined', {
            viewer: user.username,
            viewersCount: room.viewers.length
        });

        return {
            status: 'success',
            roomData: room
        };
    }

    //  Salir de una sala
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
        }

        // Salir de la sala de Socket.IO
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
            socket.leave(`room_${roomId}`);
        }
        user.currentRoom = null;

        // Notificar a los demás en la sala
        this.io.to(`room_${roomId}`).emit('userLeft', {
            username: user.username,
            roomData: room
        });

        // Si no quedan jugadores, eliminar la sala
        if (room.players.length === 0) {
            this.activeRooms.delete(roomId);
            console.log(`Sala ${roomId} eliminada (sin jugadores)`);
        }

        // Actualizar lista de salas
        this.broadcastRoomsList();
    }

    // Obtener lista de salas activas
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

    // Broadcast de la lista de salas a todos los conectados
    broadcastRoomsList() {
        const rooms = this.getRoomsList();
        this.io.emit('roomsList', rooms);
    }

    // GESTIÓN DE JUEGO

    // Marcar jugador como listo
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

        // Notificar a todos en la sala
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

    // Iniciar juego
    startGame(roomId) {
        const room = this.activeRooms.get(roomId);
        if (!room) return;

        room.status = 'playing';
        
        console.log(`Juego iniciado en sala ${roomId}`);

        // Notificar inicio del juego
        this.io.to(`room_${roomId}`).emit('gameStarted', {
            roomId: roomId,
            players: room.players
        });

        // Aquí irá la lógica del juego más adelante
    }

    // Obtener datos de una sala
    getRoomData(roomId) {
        return this.activeRooms.get(roomId);
    }
}

module.exports = RoomManager;