const Grid = require('./Grid');
const Piece = require('./Piece');
const MatchDetector = require('./MatchDetector');
const { GAME_CONFIG, GAME_STATE, GAME_COMMANDS, GRID_CONFIG } = require('./GameConstants');

class GameController {
    constructor(roomId, player1, player2, io) {
        this.roomId = roomId;
        this.io = io;
        
        // Estados de juego
        this.state = GAME_STATE.STARTING;
        this.isPaused = false;
        this.hasViewers = false;
        
        // Guardar info de jugadores
        this.players = {
            [player1.userId]: { userId: player1.userId, username: player1.username },
            [player2.userId]: { userId: player2.userId, username: player2.username }
        };
        
        // Grids de jugadores
        this.grids = {
            [player1.userId]: new Grid(player1.userId, player1.username),
            [player2.userId]: new Grid(player2.userId, player2.username)
        };
        
        // Piezas actuales
        this.currentPieces = {
            [player1.userId]: new Piece(),
            [player2.userId]: new Piece()
        };
        
        // Puntuaciones
        this.scores = {
            [player1.userId]: 0,
            [player2.userId]: 0
        };
        
        // Histórico para replay
        this.gameplayHistory = [];
        
        // Timers
        this.gameLoopInterval = null;
        this.tickRate = GAME_CONFIG.INITIAL_TICK_RATE;
        
        console.log(`GameController creado para sala ${roomId}`);
    }
    
    // NUEVO: Enviar gameInit a un espectador que acaba de unirse
    sendGameInitToViewer(socketId) {
        const playerIds = Object.keys(this.players);
        
        const initData = {
            roomId: this.roomId,
            gridConfig: {
                width: GRID_CONFIG.WIDTH,
                height: GRID_CONFIG.HEIGHT
            },
            players: playerIds.map(id => ({
                userId: parseInt(id),
                username: this.players[id].username
            }))
        };
        
        console.log(`Enviando gameInit a espectador ${socketId}:`, initData);
        this.io.to(socketId).emit('gameInit', initData);
        
        // Enviar estado actual inmediatamente después
        this.broadcastGameState();
    }
    
    // Iniciar el juego
    start() {
        this.state = GAME_STATE.PLAYING;
        
        // Enviar gameInit a todos primero
        const playerIds = Object.keys(this.players);
        const initData = {
            roomId: this.roomId,
            gridConfig: {
                width: GRID_CONFIG.WIDTH,
                height: GRID_CONFIG.HEIGHT
            },
            players: playerIds.map(id => ({
                userId: parseInt(id),
                username: this.players[id].username
            }))
        };
        
        console.log('Enviando gameInit a todos:', initData);
        this.io.to(`room_${this.roomId}`).emit('gameInit', initData);
        
        // Enviar estado inicial
        this.broadcastGameState();
        
        // Iniciar loop del juego
        this.startGameLoop();
        
        this.logEvent('game_started', { timestamp: Date.now() });
    }
    
    // Loop principal del juego
    startGameLoop() {
        this.gameLoopInterval = setInterval(() => {
            if (this.isPaused || this.state !== GAME_STATE.PLAYING) return;
            
            // Mover piezas hacia abajo
            for (const playerId in this.currentPieces) {
                this.movePieceDown(playerId);
            }
            
            // Broadcast del estado actualizado
            this.broadcastGameState();
            
        }, this.tickRate);
    }
    
    // Procesar comando de jugador
    handlePlayerCommand(playerId, command) {
        if (this.state !== GAME_STATE.PLAYING || this.isPaused) return;
        
        const piece = this.currentPieces[playerId];
        const grid = this.grids[playerId];
        
        switch(command) {
            case GAME_COMMANDS.MOVE_LEFT:
                if (piece.canMove(grid, -1)) {
                    piece.move(-1);
                }
                break;
                
            case GAME_COMMANDS.MOVE_RIGHT:
                if (piece.canMove(grid, 1)) {
                    piece.move(1);
                }
                break;
                
            case GAME_COMMANDS.MOVE_DOWN:
                this.movePieceDown(playerId);
                break;
                
            case GAME_COMMANDS.ROTATE:
                piece.rotate();
                // Verificar si es posición válida después de rotar
                if (!piece.canMoveDown(grid)) {
                    // Revertir rotación si no es válida
                    piece.rotate();
                    piece.rotate();
                }
                break;
                
            case GAME_COMMANDS.FAST_DROP:
                this.fastDrop(playerId);
                break;
        }
        
        this.logEvent('player_command', { playerId, command, timestamp: Date.now() });
        this.broadcastGameState();
    }
    
    // Mover pieza hacia abajo
    movePieceDown(playerId) {
        const piece = this.currentPieces[playerId];
        const grid = this.grids[playerId];
        
        if (piece.canMoveDown(grid)) {
            piece.moveDown();
        } else {
            // La pieza llegó al fondo - colocarla
            this.placePiece(playerId);
        }
    }
    
    // Colocar pieza en el grid
    placePiece(playerId) {
        const piece = this.currentPieces[playerId];
        const grid = this.grids[playerId];
        
        // Colocar la pieza
        piece.placeInGrid(grid);
        
        // Procesar matches
        this.processMatches(playerId);
        
        // Generar nueva pieza
        this.currentPieces[playerId] = new Piece();
        
        // Verificar game over
        if (!this.currentPieces[playerId].isValidSpawn(grid)) {
            this.handleGameOver(playerId);
        }
        
        this.logEvent('piece_placed', { playerId, timestamp: Date.now() });
    }
    
    // Procesar matches y gravedad
    processMatches(playerId) {
        const grid = this.grids[playerId];
        let comboCount = 0;
        
        // Loop hasta que no haya más matches
        while (true) {
            // Buscar matches
            const matchResult = MatchDetector.processMatches(grid);
            
            if (!matchResult.matchesFound) break;
            
            comboCount++;
            
            // Aplicar gravedad
            grid.applyGravityUntilStable();
            
            // Calcular puntos (con multiplicador de combo)
            const points = matchResult.points * (1 + comboCount * 0.5);
            this.scores[playerId] += Math.floor(points);
            
            this.logEvent('matches_found', {
                playerId,
                matchCount: matchResult.matchCount,
                points: points,
                combo: comboCount,
                timestamp: Date.now()
            });
        }
        
        // Acelerar juego si alcanza threshold
        if (this.scores[playerId] > 0 && this.scores[playerId] % GAME_CONFIG.SPEED_UP_THRESHOLD === 0) {
            this.speedUp();
        }
    }
    
    // Caída rápida
    fastDrop(playerId) {
        const piece = this.currentPieces[playerId];
        const grid = this.grids[playerId];
        
        while (piece.canMoveDown(grid)) {
            piece.moveDown();
        }
        
        this.placePiece(playerId);
    }
    
    // Acelerar el juego
    speedUp() {
        if (this.tickRate > GAME_CONFIG.MIN_TICK_RATE) {
            this.tickRate = Math.max(
                this.tickRate - GAME_CONFIG.SPEED_UP_AMOUNT,
                GAME_CONFIG.MIN_TICK_RATE
            );
            
            // Reiniciar loop con nueva velocidad
            clearInterval(this.gameLoopInterval);
            this.startGameLoop();
            
            console.log(`Juego acelerado - nuevo tickRate: ${this.tickRate}ms`);
        }
    }
    
    // Manejar game over
    handleGameOver(loserId) {
        this.state = GAME_STATE.GAME_OVER;
        clearInterval(this.gameLoopInterval);
        
        // Determinar ganador
        const playerIds = Object.keys(this.scores);
        const winnerId = playerIds.find(id => id !== loserId);
        
        this.logEvent('game_over', {
            winnerId,
            loserId,
            scores: this.scores,
            timestamp: Date.now()
        });
        
        // Notificar a todos
        this.io.to(`room_${this.roomId}`).emit('gameOver', {
            winnerId: parseInt(winnerId),
            loserId: parseInt(loserId),
            scores: this.scores
        });
        
        // Guardar replay (implementar después)
        this.saveReplay(winnerId);
    }
    
    // Pausar/reanudar por falta de espectadores
    togglePause(hasViewers) {
        this.hasViewers = hasViewers;
        
        if (!hasViewers && !this.isPaused) {
            this.isPaused = true;
            console.log(`Juego pausado en sala ${this.roomId} - no hay espectadores C#`);
            
            this.io.to(`room_${this.roomId}`).emit('gamePaused', {
                reason: 'No hay espectadores conectados'
            });
        } else if (hasViewers && this.isPaused) {
            this.isPaused = false;
            console.log(`Juego reanudado en sala ${this.roomId}`);
            
            this.io.to(`room_${this.roomId}`).emit('gameResumed');
        }
    }
    
    // CORREGIDO: Enviar estado del juego en formato que Unity espera
    broadcastGameState() {
        const playerIds = Object.keys(this.players);
        
        // Construir array de jugadores con TODA su info
        const playersData = playerIds.map(playerId => {
            const id = parseInt(playerId);
            return {
                playerId: id,
                username: this.players[playerId].username,
                score: this.scores[playerId] || 0,
                grid: this.grids[playerId].getAllNodes(),
                currentPiece: this.currentPieces[playerId].getPositions()
            };
        });
        
        const gameState = {
            roomId: this.roomId,
            state: this.state,
            isPaused: this.isPaused,
            tickRate: this.tickRate,
            timestamp: Date.now(),
            players: playersData  // ← ESTO es lo que Unity espera
        };
        
        this.io.to(`room_${this.roomId}`).emit('gameState', gameState);
    }
    
    // Registrar evento para replay
    logEvent(eventType, data) {
        this.gameplayHistory.push({
            type: eventType,
            data: data,
            timestamp: Date.now()
        });
    }
    
    // Guardar replay en base de datos
    async saveReplay(winnerId) {
        console.log(`Guardando replay de sala ${this.roomId}...`);
        
        const playerIds = Object.keys(this.grids);
        const gameplayData = {
            history: this.gameplayHistory,
            finalScores: this.scores,
            duration: Date.now() - this.gameplayHistory[0].timestamp
        };
        
        // Llamar a dbHelpers (necesitas acceso a la conexión de BD)
        // await dbHelpers.saveGameReplay(connection, roomId, player1Id, player2Id, winnerId, gameplayData, duration);
    }
    
    // Detener el juego completamente
    stop() {
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
        }
        this.state = GAME_STATE.FINISHED;
        console.log(`GameController detenido para sala ${this.roomId}`);
    }
}

module.exports = GameController;