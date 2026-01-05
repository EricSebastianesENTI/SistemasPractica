const io = require('socket.io-client');

const SERVER_URL = 'http://192.168.1.56:3000/';

// Colores para la consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

// Simular 2 clientes
let client1, client2;

function log(client, message, color = colors.reset) {
    console.log(`${color}[${client}]${colors.reset} ${message}`);
}

// Función helper para esperar con timeout
function waitForEvent(socket, eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Timeout esperando evento: ${eventName}`));
        }, timeout);

        socket.once(eventName, (data) => {
            clearTimeout(timer);
            resolve(data);
        });
    });
}

// Función helper para esperar con timeout
function waitForEvent(socket, eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Timeout esperando evento: ${eventName}`));
        }, timeout);

        socket.once(eventName, (data) => {
            clearTimeout(timer);
            resolve(data);
        });
    });
}

// Función helper para esperar
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
    console.log(`\n${colors.blue}============================================${colors.reset}`);
    console.log(`${colors.blue}  TESTING SOCKET.IO ROOMS${colors.reset}`);
    console.log(`${colors.blue}  Server: ${SERVER_URL}${colors.reset}`);
    console.log(`${colors.blue}============================================${colors.reset}\n`);

    try {
        // ==========================================
        // Conectar Cliente 1
        // ==========================================
        console.log(`${colors.yellow}[TEST 1]${colors.reset} Conectando Cliente 1...\n`);
        
        client1 = io(SERVER_URL, {
            reconnection: false
        });

        // Manejar errores de conexión
        client1.on('connect_error', (error) => {
            log('Client1', `Error de conexión: ${error.message}`, colors.red);
        });

        await waitForEvent(client1, 'connect');
        log('Client1', `Conectado (${client1.id})`, colors.green);

        // Autenticar Cliente 1
        client1.emit('authenticate', {
            userId: 1,
            username: 'Player1'
        });

        const authData1 = await waitForEvent(client1, 'authenticated');
        log('Client1', `Autenticado: ${JSON.stringify(authData1)}`, colors.green);

        await wait(1000);

        // Crear Sala (Cliente 1)
        console.log(`\n${colors.yellow}[TEST 2]${colors.reset} Cliente 1 crea una sala...\n`);

        client1.emit('createRoom', {
            roomName: 'Sala de Prueba'
        });

        const roomCreatedData = await waitForEvent(client1, 'roomCreated');
        log('Client1', `Sala creada: ${JSON.stringify(roomCreatedData)}`, colors.green);
        const roomId = roomCreatedData.roomId;

        await wait(1000);

        // Conectar Cliente 2
        console.log(`\n${colors.yellow}[TEST 3]${colors.reset} Conectando Cliente 2...\n`);
        
        client2 = io(SERVER_URL, {
            reconnection: false
        });

        client2.on('connect_error', (error) => {
            log('Client2', `Error de conexión: ${error.message}`, colors.red);
        });

        await waitForEvent(client2, 'connect');
        log('Client2', `Conectado (${client2.id})`, colors.cyan);

        // Autenticar Cliente 2
        client2.emit('authenticate', {
            userId: 2,
            username: 'Player2'
        });

        const authData2 = await waitForEvent(client2, 'authenticated');
        log('Client2', `Autenticado: ${JSON.stringify(authData2)}`, colors.cyan);

        await wait(1000);

        // Listar Salas (Cliente 2)
        console.log(`\n${colors.yellow}[TEST 4]${colors.reset} Cliente 2 lista las salas...\n`);

        client2.emit('getRooms');

        const rooms = await waitForEvent(client2, 'roomsList');
        log('Client2', `Salas disponibles (${rooms.length}):`, colors.cyan);
        rooms.forEach(room => {
            console.log(`   - ${room.name} (ID: ${room.id}, Jugadores: ${room.playersCount}/2)`);
        });

        await wait(1000);

        // Unirse a Sala (Cliente 2)
        console.log(`\n${colors.yellow}[TEST 5]${colors.reset} Cliente 2 se une a la sala...\n`);

        // Escuchar evento de jugador unido (Cliente 1)
        client1.on('playerJoined', (data) => {
            log('Client1', `👤 Jugador unido: ${data.player.username}`, colors.green);
        });

        client2.emit('joinRoomAsPlayer', {
            roomId: roomId
        });

        const joinData = await waitForEvent(client2, 'roomJoined');
        log('Client2', `Unido a la sala: ${JSON.stringify(joinData.status)}`, colors.cyan);

        await wait(1000);

        // Marcar como Listo
        console.log(`\n${colors.yellow}[TEST 6]${colors.reset} Jugadores se marcan como listos...\n`);

        // Escuchar eventos de ready
        client1.on('playerReady', (data) => {
            log('Client1', `✅ ${data.username} está ${data.isReady ? 'listo' : 'no listo'}`, colors.green);
        });

        client2.on('playerReady', (data) => {
            log('Client2', `✅ ${data.username} está ${data.isReady ? 'listo' : 'no listo'}`, colors.cyan);
        });

        // Cliente 1 listo
        client1.emit('setReady', { isReady: true });
        await wait(500);

        // Cliente 2 listo
        client2.emit('setReady', { isReady: true });
        await wait(500);

        // Inicio del Juego
        console.log(`\n${colors.yellow}[TEST 7]${colors.reset} Esperando inicio del juego...\n`);

        const gameData = await waitForEvent(client1, 'gameStarted', 3000);
        log('AMBOS', `JUEGO INICIADO en sala ${gameData.roomId}`, colors.magenta);
        log('AMBOS', `   Jugadores: ${gameData.players.map(p => p.username).join(' vs ')}`, colors.magenta);

        await wait(2000);

        // Salir de la Sala
        console.log(`\n${colors.yellow}[TEST 8]${colors.reset} Cliente 2 sale de la sala...\n`);

        // Escuchar cuando alguien se va
        client1.on('userLeft', (data) => {
            log('Client1', ` ${data.username} salió de la sala`, colors.yellow);
        });

        client2.emit('leaveRoom', { roomId: roomId });

        const leaveData = await waitForEvent(client2, 'roomLeft');
        log('Client2', `Salió de la sala`, colors.cyan);

        await wait(1000);

        // ==========================================
        // Resumen
        // ==========================================
        console.log(`\n${colors.blue}============================================${colors.reset}`);
        console.log(`${colors.blue}  TESTS COMPLETADOS${colors.reset}`);
        console.log(`${colors.blue}============================================${colors.reset}`);
        console.log(`${colors.green} Todos los tests de Socket.IO pasaron${colors.reset}\n`);

    } catch (error) {
        console.error(`${colors.red} Error durante los tests:${colors.reset}`, error.message);
        console.error(`${colors.red}Stack:${colors.reset}`, error.stack);
    } finally {
        // Desconectar clientes
        if (client1) {
            client1.disconnect();
            log('Client1', ' Desconectado', colors.yellow);
        }
        if (client2) {
            client2.disconnect();
            log('Client2', ' Desconectado', colors.yellow);
        }
        
        console.log(`${colors.yellow}\n Tests finalizados${colors.reset}\n`);
        
        setTimeout(() => process.exit(0), 500);
    }
}

// Ejecutar tests
runTests();