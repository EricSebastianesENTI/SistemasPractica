const gameState = {
    socket: null,
    user: null,
    roomId: null,
    isPlayer: true, // Siempre es jugador en el cliente web
    playerId: null,
    opponentId: null,
    currentGameState: null
};

// Comandos de juego
const GAME_COMMANDS = {
    MOVE_LEFT: 'moveLeft',
    MOVE_RIGHT: 'moveRight',
    MOVE_DOWN: 'moveDown',
    ROTATE: 'rotate',
    FAST_DROP: 'fastDrop'
};

// INICIALIZACIÓN

document.addEventListener('DOMContentLoaded', () => {
    console.log('Cliente de control iniciado');
    
    // Verificar usuario logueado
    const savedUser = localStorage.getItem('columnsUser');
    if (!savedUser) {
        alert('Debes iniciar sesión primero');
        window.location.href = '/lobby';
        return;
    }
    
    gameState.user = JSON.parse(savedUser);
    document.getElementById('user-name').textContent = gameState.user.username;
    
    // Obtener roomId de la URL
    const urlParams = new URLSearchParams(window.location.search);
    gameState.roomId = urlParams.get('roomId');
    
    if (!gameState.roomId) {
        alert('No se especificó sala');
        window.location.href = '/lobby';
        return;
    }
    
    console.log(`Conectando a sala ${gameState.roomId}...`);
    
    // Conectar Socket.IO
    connectSocket();
    
    // Event listeners
    setupEventListeners();
    setupKeyboardControls();
});

// SETUP

function setupEventListeners() {
    // Botón salir
    document.getElementById('leave-game-btn').addEventListener('click', () => {
        if (confirm('¿Seguro que quieres salir?')) {
            leaveGame();
        }
    });
    
    // Botón volver al lobby
    document.getElementById('back-to-lobby-btn').addEventListener('click', () => {
        window.location.href = '/lobby';
    });
    
    // Botones de control
    document.getElementById('btn-left').addEventListener('click', () => {
        sendGameCommand(GAME_COMMANDS.MOVE_LEFT);
    });
    
    document.getElementById('btn-right').addEventListener('click', () => {
        sendGameCommand(GAME_COMMANDS.MOVE_RIGHT);
    });
    
    document.getElementById('btn-down').addEventListener('click', () => {
        sendGameCommand(GAME_COMMANDS.MOVE_DOWN);
    });
    
    document.getElementById('btn-rotate').addEventListener('click', () => {
        sendGameCommand(GAME_COMMANDS.ROTATE);
    });
    
    document.getElementById('btn-fast-drop').addEventListener('click', () => {
        sendGameCommand(GAME_COMMANDS.FAST_DROP);
    });
    
    // Chat
    document.getElementById('send-chat-btn').addEventListener('click', sendChatMessage);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
}

function setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        if (!gameState.currentGameState) return;
        if (gameState.currentGameState.state !== 'playing') return;
        if (gameState.currentGameState.isPaused) return;
        
        // Si está escribiendo en el chat, no capturar teclas
        if (document.activeElement.id === 'chat-input') return;
        
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
                // Solo si NO está en el input del chat
                if (document.activeElement.id !== 'chat-input') {
                    command = GAME_COMMANDS.FAST_DROP;
                    e.preventDefault();
                }
                break;
        }
        
        if (command) {
            sendGameCommand(command);
            // Feedback visual
            highlightButton(command);
        }
    });
}

function highlightButton(command) {
    let btnId = null;
    switch(command) {
        case GAME_COMMANDS.MOVE_LEFT: btnId = 'btn-left'; break;
        case GAME_COMMANDS.MOVE_RIGHT: btnId = 'btn-right'; break;
        case GAME_COMMANDS.MOVE_DOWN: btnId = 'btn-down'; break;
        case GAME_COMMANDS.ROTATE: btnId = 'btn-rotate'; break;
        case GAME_COMMANDS.FAST_DROP: btnId = 'btn-fast-drop'; break;
    }
    
    if (btnId) {
        const btn = document.getElementById(btnId);
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 100);
    }
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
        
        // Unirse a la sala como jugador
        gameState.socket.emit('joinRoomAsPlayer', {
            roomId: parseInt(gameState.roomId)
        });
    });
    
    gameState.socket.on('roomJoined', (data) => {
        if (data.status === 'success') {
            console.log('Unido a sala exitosamente');
            const room = data.roomData;
            
            document.getElementById('room-name').textContent = room.name;
            
            // Establecer playerId
            const player = room.players.find(p => p.userId === gameState.user.userId);
            if (player) {
                gameState.playerId = player.userId;
            }
            
            // Identificar oponente
            const opponent = room.players.find(p => p.userId !== gameState.user.userId);
            if (opponent) {
                gameState.opponentId = opponent.userId;
            }
            
            addSystemMessage(`Conectado a: ${room.name}`);
        } else {
            alert('Error al unirse: ' + data.message);
            window.location.href = '/lobby';
        }
    });
    
    // Estado del juego actualizado
    gameState.socket.on('gameState', (data) => {
        gameState.currentGameState = data;
        updateGameInfo(data);
    });
    
    gameState.socket.on('gameStarted', (data) => {
        console.log('¡Juego iniciado!');
        document.getElementById('game-state').textContent = 'En Juego';
        addSystemMessage('¡El juego ha comenzado!');
    });
    
    gameState.socket.on('gamePaused', (data) => {
        console.log('Juego pausado:', data.reason);
        showPauseOverlay(data.reason);
        addSystemMessage(`Juego pausado: ${data.reason}`);
    });
    
    gameState.socket.on('gameResumed', () => {
        console.log('▶Juego reanudado');
        hidePauseOverlay();
        addSystemMessage('Juego reanudado');
    });
    
    gameState.socket.on('gameOver', (data) => {
        console.log('Game Over:', data);
        showGameOverOverlay(data);
    });
    
    // Chat
    gameState.socket.on('chatMessage', (data) => {
        addChatMessage(data.username, data.message, data.userId === gameState.user.userId);
    });
    
    gameState.socket.on('error', (data) => {
        console.error('Error del servidor:', data);
        addSystemMessage(`Error: ${data.message}`);
    });
    
    gameState.socket.on('disconnect', () => {
        console.log('Socket desconectado');
        addSystemMessage('Desconectado del servidor');
    });
}

function sendGameCommand(command) {
    if (!gameState.socket) return;
    
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

// ACTUALIZACIÓN DE INTERFAZ

function updateGameInfo(data) {
    // Actualizar estado
    const stateTexts = {
        'waiting': 'Esperando...',
        'starting': 'Iniciando...',
        'playing': data.isPaused ? 'Pausado' : 'En Juego',
        'gameOver': 'Game Over',
        'finished': 'Finalizado'
    };
    
    document.getElementById('game-state').textContent = stateTexts[data.state] || data.state;
    
    // Actualizar puntuaciones
    if (data.scores && gameState.playerId) {
        document.getElementById('my-score').textContent = data.scores[gameState.playerId] || 0;
        
        if (gameState.opponentId) {
            document.getElementById('opponent-score').textContent = data.scores[gameState.opponentId] || 0;
        }
    }
}

// CHAT

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    if (gameState.socket) {
        gameState.socket.emit('chatMessage', {
            roomId: parseInt(gameState.roomId),
            message: message
        });
    }
    
    input.value = '';
}

function addChatMessage(username, message, isMe) {
    const container = document.getElementById('chat-messages');
    const p = document.createElement('p');
    
    p.className = isMe ? 'my-message' : 'other-message';
    p.textContent = `${username}: ${message}`;
    
    container.appendChild(p);
    container.scrollTop = container.scrollHeight;
}

function addSystemMessage(message) {
    const container = document.getElementById('chat-messages');
    const p = document.createElement('p');
    
    p.className = 'system-message';
    p.textContent = message;
    
    container.appendChild(p);
    container.scrollTop = container.scrollHeight;
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
    const isWinner = data.winnerId === gameState.playerId;
    
    document.getElementById('gameover-title').textContent = 
        isWinner ? '¡VICTORIA!' : 'DERROTA';
    
    const winnerName = isWinner ? 'TÚ' : 'Tu oponente';
    document.getElementById('gameover-message').textContent = 
        `${winnerName} ganó la partida`;
    
    // Puntuaciones finales
    document.getElementById('final-my-score').textContent = 
        data.scores[gameState.playerId] || 0;
    document.getElementById('final-opponent-score').textContent = 
        data.scores[gameState.opponentId] || 0;
    
    document.getElementById('gameover-overlay').style.display = 'flex';
}