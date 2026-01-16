const Grid = require('./Grid');
const Piece = require('./Piece');
const MatchDetector = require('./MatchDetector');
const { GAME_CONFIG, GAME_STATE, GAME_COMMANDS, GRID_CONFIG } = require('./GameConstants');

class GameController {
    constructor(roomId, player1, player2, io) {
        this.roomId = roomId;
        this.io = io;
        
        this.state = GAME_STATE.STARTING;
        this.isPaused = false;
        this.hasViewers = false;
        
        this.players = {
            [player1.userId]: {
                userId: player1.userId,
                username: player1.username,
                socketId: player1.socketId
            },
            [player2.userId]: {
                userId: player2.userId,
                username: player2.username,
                socketId: player2.socketId
            }
        };
        
        this.grids = {
            [player1.userId]: new Grid(player1.userId, player1.username),
            [player2.userId]: new Grid(player2.userId, player2.username)
        };
        
        this.currentPieces = {
            [player1.userId]: new Piece(),
            [player2.userId]: new Piece()
        };
        
        this.scores = {
            [player1.userId]: 0,
            [player2.userId]: 0
        };
        
        this.gameplayHistory = [];
        
        this.gameLoopInterval = null;
        this.tickRate = GAME_CONFIG.INITIAL_TICK_RATE;
        
        console.log(`GameController creado para sala ${roomId}`);
    }
    
    start() {
        this.state = GAME_STATE.PLAYING;
        
        this.broadcastGameInit();
        
        this.broadcastGameState();
        
        this.startGameLoop();
        
        this.logEvent('game_started', { timestamp: Date.now() });
    }
    
    broadcastGameInit() {
        const playersArray = Object.values(this.players);
        
        const initData = {
            roomId: this.roomId,
            gridConfig: {
                width: GRID_CONFIG.WIDTH,
                height: GRID_CONFIG.HEIGHT
            },
            players: playersArray.map(p => ({
                userId: p.userId,
                username: p.username
            }))
        };
        
        this.io.to(`room_${this.roomId}`).emit('gameInit', initData);
        console.log('Configuración inicial enviada a clientes');
    }
    
    startGameLoop() {
        this.gameLoopInterval = setInterval(() => {
            if (this.isPaused || this.state !== GAME_STATE.PLAYING) return;
            
            for (const playerId in this.currentPieces) {
                this.movePieceDown(playerId);
            }
            
            this.broadcastGameState();
            
        }, this.tickRate);
    }
    
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

                if (!piece.canMoveDown(grid)) {
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
    
    movePieceDown(playerId) {
        const piece = this.currentPieces[playerId];
        const grid = this.grids[playerId];
        
        if (piece.canMoveDown(grid)) {
            piece.moveDown();
        } else {
            this.placePiece(playerId);
        }
    }
    
    placePiece(playerId) {
        const piece = this.currentPieces[playerId];
        const grid = this.grids[playerId];
        
        piece.placeInGrid(grid);
        
        this.processMatches(playerId);
        
        this.currentPieces[playerId] = new Piece();
        
        if (!this.currentPieces[playerId].isValidSpawn(grid)) {
            this.handleGameOver(playerId);
        }
        
        this.logEvent('piece_placed', { playerId, timestamp: Date.now() });
    }
    
    processMatches(playerId) {
        const grid = this.grids[playerId];
        let comboCount = 0;
        
        while (true) {
            const matchResult = MatchDetector.processMatches(grid);
            
            if (!matchResult.matchesFound) break;
            
            comboCount++;
            
            grid.applyGravityUntilStable();
            
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
        
        if (this.scores[playerId] > 0 && this.scores[playerId] % GAME_CONFIG.SPEED_UP_THRESHOLD === 0) {
            this.speedUp();
        }
    }
    
    fastDrop(playerId) {
        const piece = this.currentPieces[playerId];
        const grid = this.grids[playerId];
        
        while (piece.canMoveDown(grid)) {
            piece.moveDown();
        }
        
        this.placePiece(playerId);
    }
    
    speedUp() {
        if (this.tickRate > GAME_CONFIG.MIN_TICK_RATE) {
            this.tickRate = Math.max(
                this.tickRate - GAME_CONFIG.SPEED_UP_AMOUNT,
                GAME_CONFIG.MIN_TICK_RATE
            );
            
            clearInterval(this.gameLoopInterval);
            this.startGameLoop();
            
            console.log(`Juego acelerado - nuevo tickRate: ${this.tickRate}ms`);
        }
    }
    
    handleGameOver(loserId) {
        this.state = GAME_STATE.GAME_OVER;
        clearInterval(this.gameLoopInterval);
        
        const playerIds = Object.keys(this.scores);
        const winnerId = playerIds.find(id => id !== loserId);
        
        this.logEvent('game_over', {
            winnerId,
            loserId,
            scores: this.scores,
            timestamp: Date.now()
        });
        
        this.io.to(`room_${this.roomId}`).emit('gameOver', {
            winnerId,
            loserId,
            scores: this.scores
        });
        
        this.saveReplay(winnerId);
    }
    
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
    
    // Enviar estado del juego para Unity
    broadcastGameState() {
        const gameState = {
            roomId: this.roomId,
            state: this.state,
            isPaused: this.isPaused,
            tickRate: this.tickRate,
            timestamp: Date.now(),
            players: []
        };

        for (const playerId in this.grids) {
            const playerData = {
                playerId: parseInt(playerId),
                username: this.players[playerId].username,
                score: this.scores[playerId],
                grid: this.grids[playerId].getAllNodes(),
                currentPiece: this.currentPieces[playerId].getPositions()
            };
            
            gameState.players.push(playerData);
        }
        
        this.io.to(`room_${this.roomId}`).emit('gameState', gameState);
    }
    
    logEvent(eventType, data) {
        this.gameplayHistory.push({
            type: eventType,
            data: data,
            timestamp: Date.now()
        });
    }
    
    async saveReplay(winnerId) {
        console.log(`Guardando replay de sala ${this.roomId}...`);
        
        const playerIds = Object.keys(this.grids);
        const gameplayData = {
            history: this.gameplayHistory,
            finalScores: this.scores,
            duration: Date.now() - this.gameplayHistory[0].timestamp
        };
        
        // Llamar a dbHelpers cuando esté implementado
        // await dbHelpers.saveGameReplay(connection, roomId, player1Id, player2Id, winnerId, gameplayData, duration);
    }
    
    stop() {
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
        }
        this.state = GAME_STATE.FINISHED;
        console.log(`GameController detenido para sala ${this.roomId}`);
    }
}

module.exports = GameController;