// Estado del cliente
const state = {
    socket: null,
    user: null,
    currentRoom: null,
    isReady: false
};

// INICIALIZACIÓN

document.addEventListener('DOMContentLoaded', () => {
    console.log('Columns Lobby Iniciado');
    
    // Verificar si hay sesión guardada
    const savedUser = localStorage.getItem('columnsUser');
    if (savedUser) {
        state.user = JSON.parse(savedUser);
        connectSocket();
        showScreen('lobby');
        document.getElementById('username-display').textContent = state.user.username;
    } else {
        showScreen('login');
    }
    
    setupEventListeners();
});

// EVENT LISTENERS

function setupEventListeners() {
    // Tabs de Login/Register
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            switchTab(tab);
        });
    });

    // Formulario de Login
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // Formulario de Register
    document.getElementById('register-form').addEventListener('submit', handleRegister);

    // Crear Sala
    document.getElementById('create-room-btn').addEventListener('click', handleCreateRoom);

    // Salir del Lobby
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Salir de Sala
    document.getElementById('leave-room-btn').addEventListener('click', handleLeaveRoom);

    // Botón Ready
    document.getElementById('ready-btn').addEventListener('click', handleReady);

    // Enter para crear sala
    document.getElementById('room-name-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleCreateRoom();
        }
    });
}

// AUTENTICACIÓN

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errorEl = document.getElementById('login-error');
    
    errorEl.textContent = '';
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            state.user = {
                userId: data.userId,
                username: data.username
            };
            
            // Guardar en localStorage
            localStorage.setItem('columnsUser', JSON.stringify(state.user));
            
            // Conectar Socket.IO
            connectSocket();
            
            // Mostrar lobby
            showScreen('lobby');
            document.getElementById('username-display').textContent = username;
            
            console.log('Login exitoso');
        } else {
            errorEl.textContent = data.message || 'Login failed';
        }
    } catch (error) {
        console.error('Error en login:', error);
        errorEl.textContent = 'Connection error. Please try again.';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const errorEl = document.getElementById('register-error');
    
    errorEl.textContent = '';
    
    if (username.length < 3) {
        errorEl.textContent = 'Username must be at least 3 characters';
        return;
    }
    
    if (password.length < 4) {
        errorEl.textContent = 'Password must be at least 4 characters';
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Registro exitoso - auto login
            document.getElementById('login-username').value = username;
            document.getElementById('login-password').value = password;
            
            switchTab('login');
            
            // Mensaje de éxito
            const loginError = document.getElementById('login-error');
            loginError.style.color = '#27ae60';
            loginError.textContent = 'Registration successful! You can now login.';
            
            console.log('Registro exitoso');
        } else {
            errorEl.textContent = data.message || 'Registration failed';
        }
    } catch (error) {
        console.error('Error en registro:', error);
        errorEl.textContent = 'Connection error. Please try again.';
    }
}

function handleLogout() {
    if (state.socket) {
        state.socket.disconnect();
    }
    
    localStorage.removeItem('columnsUser');
    state.user = null;
    state.currentRoom = null;
    
    showScreen('login');
    console.log('Logout exitoso');
}

// SOCKET.IO

function connectSocket() {
    console.log('Conectando a Socket.IO...');
    
    state.socket = io();
    
    state.socket.on('connect', () => {
        console.log('Socket conectado:', state.socket.id);
        
        // Autenticar
        state.socket.emit('authenticate', {
            userId: state.user.userId,
            username: state.user.username
        });
    });
    
    state.socket.on('authenticated', (data) => {
        console.log('Autenticado en el servidor');
    });
    
    state.socket.on('roomsList', (rooms) => {
        console.log('Lista de salas actualizada:', rooms.length);
        updateRoomsList(rooms);
    });
    
    state.socket.on('roomCreated', (data) => {
        if (data.status === 'success') {
            console.log('Sala creada:', data.roomId);
            state.currentRoom = data.roomData;
            showWaitingRoom();
        } else {
            alert('Error creating room: ' + data.message);
        }
    });
    
    state.socket.on('roomJoined', (data) => {
        if (data.status === 'success') {
            console.log('Unido a sala');
            state.currentRoom = data.roomData;
            showWaitingRoom();
        } else {
            alert('Error joining room: ' + data.message);
        }
    });
    
    state.socket.on('playerJoined', (data) => {
        console.log('Jugador se unió:', data.player.username);
        if (state.currentRoom) {
            state.currentRoom.players = data.roomData.players;
            updateWaitingRoom();
        }
    });
    
    state.socket.on('playerReady', (data) => {
        console.log('Jugador listo:', data.username, data.isReady);
        updatePlayerReadyStatus(data.username, data.isReady);
    });
    
    state.socket.on('gameStarted', (data) => {
        console.log('JUEGO INICIADO!');
        
        // Redirigir a la página de juego
        const roomId = state.currentRoom.id;
        window.location.href = `/game?roomId=${roomId}&type=player`;
    });
    
    state.socket.on('userLeft', (data) => {
        console.log('Usuario salió:', data.username);
        if (state.currentRoom) {
            state.currentRoom = data.roomData;
            updateWaitingRoom();
        }
    });
    
    state.socket.on('roomLeft', (data) => {
        console.log('Saliste de la sala');
        state.currentRoom = null;
        state.isReady = false;
        showScreen('lobby');
    });
    
    state.socket.on('error', (data) => {
        console.error('Error del servidor:', data.message);
        if (data.code === 'SERVER_NOT_READY') {
            alert('Server is initializing, please wait a moment and try again.');
        }
    });
    
    state.socket.on('disconnect', () => {
        console.log('Socket desconectado');
    });
}

// GESTIÓN DE SALAS

function updateRoomsList(rooms) {
    const container = document.getElementById('rooms-container');
    
    if (rooms.length === 0) {
        container.innerHTML = '<p class="no-rooms">No rooms available. Create one!</p>';
        return;
    }
    
    container.innerHTML = rooms.map(room => `
        <div class="room-card" data-room-id="${room.id}">
            <div class="room-info">
                <h3>${escapeHtml(room.name)}</h3>
                <div class="room-status">
                    <span>${room.playersCount}/2 Players</span>
                    <span>${room.viewersCount} Viewers</span>
                    <span>Status: ${room.status}</span>
                </div>
            </div>
            <button onclick="joinRoom(${room.id})" ${room.playersCount >= 2 ? 'disabled' : ''}>
                ${room.playersCount >= 2 ? 'Full' : 'Join'}
            </button>
        </div>
    `).join('');
}

function handleCreateRoom() {
    const roomName = document.getElementById('room-name-input').value.trim();
    
    if (!roomName) {
        alert('Please enter a room name');
        return;
    }
    
    if (roomName.length < 3) {
        alert('Room name must be at least 3 characters');
        return;
    }
    
    console.log('Creando sala:', roomName);
    state.socket.emit('createRoom', { roomName });
    
    document.getElementById('room-name-input').value = '';
}

function joinRoom(roomId) {
    console.log('Uniéndose a sala:', roomId);
    state.socket.emit('joinRoomAsPlayer', { roomId });
}

function handleLeaveRoom() {
    if (state.currentRoom) {
        state.socket.emit('leaveRoom', { roomId: state.currentRoom.id });
    }
}

// SALA DE ESPERA

function showWaitingRoom() {
    showScreen('waiting-room');
    document.getElementById('room-title').textContent = state.currentRoom.name;
    updateWaitingRoom();
}

function updateWaitingRoom() {
    const room = state.currentRoom;
    
    // Player 1
    if (room.players[0]) {
        document.getElementById('player1-name').textContent = room.players[0].username;
        const status1 = document.getElementById('player1-status');
        status1.textContent = room.players[0].isReady ? 'Ready!' : 'Not Ready';
        status1.className = room.players[0].isReady ? 'status ready' : 'status';
    }
    
    // Player 2
    if (room.players[1]) {
        document.getElementById('player2-name').textContent = room.players[1].username;
        const status2 = document.getElementById('player2-status');
        status2.textContent = room.players[1].isReady ? 'Ready!' : 'Not Ready';
        status2.className = room.players[1].isReady ? 'status ready' : 'status';
    } else {
        document.getElementById('player2-name').textContent = 'Waiting...';
        document.getElementById('player2-status').textContent = 'Not Ready';
        document.getElementById('player2-status').className = 'status';
    }
    
    // Actualizar boton ready
    updateReadyButton();
}

function updatePlayerReadyStatus(username, isReady) {
    if (!state.currentRoom) return;
    
    const player = state.currentRoom.players.find(p => p.username === username);
    if (player) {
        player.isReady = isReady;
        updateWaitingRoom();
    }
}

function handleReady() {
    state.isReady = !state.isReady;
    
    console.log('Cambiando estado ready:', state.isReady);
    state.socket.emit('setReady', { isReady: state.isReady });
    
    updateReadyButton();
}

function updateReadyButton() {
    const btn = document.getElementById('ready-btn');
    
    if (state.isReady) {
        btn.textContent = "I'm Not Ready";
        btn.classList.add('not-ready');
    } else {
        btn.textContent = "I'm Ready!";
        btn.classList.remove('not-ready');
    }
}

// UI HELPERS

function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    document.getElementById(`${screenName}-screen`).classList.add('active');
}

function switchTab(tabName) {
    // Botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Contenido
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.joinRoom = joinRoom;