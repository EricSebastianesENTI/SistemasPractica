// Estado del cliente
const gameState = {
    socket: null,
    user: null,
    roomId: null,
    isPlayer: false,
    playerId: null,
    
    // Canvas
    canvasP1: null,
    ctxP1: null,
    canvasP2: null,
    ctxP2: null,
    
    // Game state del servidor
    currentGameState: null
};

// Constantes del juego (deben coincidir con GameConstants.js del servidor)
const GRID_CONFIG = {
    WIDTH: 6,
    HEIGHT: 13
};

const JEWEL_COLORS = {
    0: '#1a1a2e',      // NONE - Fondo oscuro
    1: '#ff6b6b',      // RED
    2: '#51cf66',      // GREEN
    3: '#4dabf7',      // BLUE
    4: '#ffd43b',      // YELLOW
    5: '#ff922b',      // ORANGE
    6: '#da77f2',      // PURPLE
    7: '#f8f9fa'       // SHINY - Blanco brillante
};

const GAME_COMMANDS = {
    MOVE_LEFT: 'moveLeft',
    MOVE_RIGHT: 'moveRight',
    MOVE_DOWN: 'moveDown',
    ROTATE: 'rotate',
    FAST_DROP: 'fastDrop'
};

// INICIALIZACIÓN

document.addEventListener('DOMContentLoaded', () => {
    console.log('Game client iniciado');
    
    // Verificar que haya usuario logueado
    const savedUser = localStorage.getItem('columnsUser');
    if (!savedUser) {
        alert('Debes iniciar sesión primero');
        window.location.href = '/lobby';
        return;
    }
    
    gameState.user = JSON.parse(savedUser);
    
    // Obtener roomId de la URL
    const urlParams = new URLSearchParams(window.location.search);
    gameState.roomId = urlParams.get('roomId');
    gameState.isPlayer = urlParams.get('type') === 'player';
    
    if (!gameState.roomId) {
        alert('No se especificó sala');
        window.location.href = '/lobby';
        return;
    }
    
    // Inicializar canvas
    setupCanvas();
    
    // Conectar Socket.IO
    connectSocket();
    
    // Event listeners
    setupEventListeners();
    
    // Capturar teclado si es jugador
    if (gameState.isPlayer) {
        setupKeyboardControls();
        document.getElementById('controls-panel').style.display = 'block';
    }
});

// SETUP

function setupCanvas() {
    gameState.canvasP1 = document.getElementById('grid-player1');
    gameState.ctxP1 = gameState.canvasP1.getContext('2d');
    
    gameState.canvasP2 = document.getElementById('grid-player2');
    gameState.ctxP2 = gameState.canvasP2.getContext('2d');
    
    console.log('Canvas inicializados');
}

function setupEventListeners() {
    document.getElementById('leave-game-btn').addEventListener('click', () => {
        if (confirm('¿Seguro que quieres salir?')) {
            leaveGame();
        }
    });
    
    document.getElementById('back-to-lobby-btn').addEventListener('click', () => {
        window.location.href = '/lobby';
    });
}

function setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        if (!gameState.isPlayer || !gameState.currentGameState) return;
        if (gameState.currentGameState.state !== 'playing' || gameState.currentGameState.isPaused) return;
        
        let command = null;
        
        switch(e.key) {
            case 'ArrowLeft':
                command = GAME_COMMANDS.MOVE_LEFT;
                e.preventDefault();
                break;
            case 'ArrowRight':
                command = GAME_COMMANDS.MOVE_RIGHT;
                e.preventDefault();
                break;
            case 'ArrowDown':
                command = GAME_COMMANDS.MOVE_DOWN;
                e.preventDefault();
                break;
            case ' ':
                command = GAME_COMMANDS.ROTATE;
                e.preventDefault();
                break;
            case 'Enter':
                command = GAME_COMMANDS.FAST_DROP;
                e.preventDefault();
                break;
        }
        
        if (command) {
            sendGameCommand(command);
        }
    });
}

// SOCKET.IO

function connectSocket() {
    console.log('Conectando a Socket.IO...');
    
    gameState.socket = io();
    
    gameState.socket.on('connect', () => {
        console.log('Socket conectado:', gameState.socket.id);
        
        // Autenticar
        gameState.socket.emit('authenticate', {
            userId: gameState.user.userId,
            username: gameState.user.username
        });
    });
    
    gameState.socket.on('authenticated', () => {
        console.log('Autenticado - Uniéndose a sala...');
        
        // Unirse a la sala
        if (gameState.isPlayer) {
            gameState.socket.emit('joinRoomAsPlayer', {
                roomId: parseInt(gameState.roomId)
            });
        } else {
            gameState.socket.emit('joinRoomAsViewer', {
                roomId: parseInt(gameState.roomId)
            });
        }
    });
    
    gameState.socket.on('roomJoined', (data) => {
        if (data.status === 'success') {
            console.log('Unido a sala exitosamente');
            const room = data.roomData;
            
            document.getElementById('room-name').textContent = room.name;
            
            // Establecer playerId si es jugador
            if (gameState.isPlayer) {
                const player = room.players.find(p => p.userId === gameState.user.userId);
                if (player) {
                    gameState.playerId = player.userId;
                }
            }
        } else {
            alert('Error al unirse: ' + data.message);
            window.location.href = '/lobby';
        }
    });
    
    // Escuchar actualizaciones del juego
    gameState.socket.on('gameState', (data) => {
        gameState.currentGameState = data;
        updateGameDisplay(data);
    });
    
    gameState.socket.on('gameStarted', (data) => {
        console.log('🎮 Juego iniciado!');
        document.getElementById('game-state').textContent = '🎮 En Juego';
    });
    
    gameState.socket.on('gamePaused', (data) => {
        console.log('Juego pausado:', data.reason);
        showPauseOverlay(data.reason);
    });
    
    gameState.socket.on('gameResumed', () => {
        console.log('Juego reanudado');
        hidePauseOverlay();
    });
    
    gameState.socket.on('gameOver', (data) => {
        console.log('Game Over:', data);
        showGameOverOverlay(data);
    });
    
    gameState.socket.on('error', (data) => {
        console.error('Error del servidor:', data);
        alert(data.message);
    });
    
    gameState.socket.on('disconnect', () => {
        console.log('Socket desconectado');
    });
}

function sendGameCommand(command) {
    if (!gameState.socket || !gameState.isPlayer) return;
    
    gameState.socket.emit('gameCommand', { command });
}

function leaveGame() {
    if (gameState.socket) {
        gameState.socket.emit('leaveRoom', {
            roomId: parseInt(gameState.roomId)
        });
    }
    
    window.location.href = '/lobby';
}

// RENDERIZADO

function updateGameDisplay(data) {
    // Actualizar estado del juego
    const stateTexts = {
        'waiting': 'Esperando jugadores...',
        'starting': 'Iniciando...',
        'playing': data.isPaused ? 'PAUSADO' : 'En Juego',
        'gameOver': 'Game Over',
        'finished': 'Finalizado'
    };
    
    document.getElementById('game-state').textContent = stateTexts[data.state] || data.state;
    
    // Obtener IDs de jugadores
    const playerIds = Object.keys(data.grids);
    
    if (playerIds.length >= 2) {
        // Actualizar nombres y puntos
        const p1Id = playerIds[0];
        const p2Id = playerIds[1];
        
        // Encontrar nombres (desde currentGameState o user data)
        document.getElementById('player1-name').textContent = `Jugador ${p1Id}`;
        document.getElementById('player2-name').textContent = `Jugador ${p2Id}`;
        
        document.getElementById('player1-score').textContent = data.scores[p1Id] || 0;
        document.getElementById('player2-score').textContent = data.scores[p2Id] || 0;
        
        // Renderizar grids
        renderGrid(gameState.ctxP1, data.grids[p1Id], data.currentPieces[p1Id]);
        renderGrid(gameState.ctxP2, data.grids[p2Id], data.currentPieces[p2Id]);
    }
}

function renderGrid(ctx, gridNodes, piecePositions) {
    const canvas = ctx.canvas;
    const cellWidth = canvas.width / GRID_CONFIG.WIDTH;
    const cellHeight = canvas.height / GRID_CONFIG.HEIGHT;
    
    // Limpiar canvas
    ctx.fillStyle = JEWEL_COLORS[0];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Crear mapa de celdas ocupadas por la pieza actual
    const pieceMap = new Map();
    if (piecePositions) {
        piecePositions.forEach(pos => {
            pieceMap.set(`${pos.x},${pos.y}`, pos.type);
        });
    }
    
    // Dibujar grid de abajo hacia arriba (y=0 es el fondo)
    for (let y = 0; y < GRID_CONFIG.HEIGHT; y++) {
        for (let x = 0; x < GRID_CONFIG.WIDTH; x++) {
            const node = gridNodes.find(n => n.x === x && n.y === y);
            let jewelType = node ? node.type : 0;
            
            // Si esta posición tiene una pieza actual, usar ese tipo
            const pieceKey = `${x},${y}`;
            if (pieceMap.has(pieceKey)) {
                jewelType = pieceMap.get(pieceKey);
            }
            
            // Calcular posición en canvas (invertir Y para que y=0 esté abajo)
            const canvasX = x * cellWidth;
            const canvasY = canvas.height - (y + 1) * cellHeight;
            
            // Dibujar celda
            drawJewel(ctx, canvasX, canvasY, cellWidth, cellHeight, jewelType);
        }
    }
}

function drawJewel(ctx, x, y, width, height, type) {
    const color = JEWEL_COLORS[type] || JEWEL_COLORS[0];
    
    // Fondo
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, width - 2, height - 2);
    
    // Si no es vacío, añadir borde para efecto 3D
    if (type !== 0) {
        // Borde superior/izquierdo más claro
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + height - 2);
        ctx.lineTo(x + 2, y + 2);
        ctx.lineTo(x + width - 2, y + 2);
        ctx.stroke();
        
        // Borde inferior/derecho más oscuro
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.moveTo(x + width - 2, y + 2);
        ctx.lineTo(x + width - 2, y + height - 2);
        ctx.lineTo(x + 2, y + height - 2);
        ctx.stroke();
    }
    
    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
}

// OVERLAYS

function showPauseOverlay(message) {
    document.getElementById('pause-message').textContent = message;
    document.getElementById('pause-overlay').style.display = 'flex';
}

function hidePauseOverlay() {
    document.getElementById('pause-overlay').style.display = 'none';
}

function showGameOverOverlay(data) {
    const winnerName = data.winnerId === gameState.playerId ? 'TÚ' : `Jugador ${data.winnerId}`;
    
    document.getElementById('gameover-title').textContent = 
        data.winnerId === gameState.playerId ? '¡VICTORIA!' : 'DERROTA';
    
    document.getElementById('gameover-message').textContent = 
        `${winnerName} ganó con ${data.scores[data.winnerId]} puntos`;
    
    document.getElementById('gameover-overlay').style.display = 'flex';
}