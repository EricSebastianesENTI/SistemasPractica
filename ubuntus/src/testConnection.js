const io = require('socket.io-client');

const SERVER_URL = 'http://192.168.1.56:3000/';

console.log(' Intentando conectar a:', SERVER_URL);
console.log(' Esperando...\n');

const socket = io(SERVER_URL, {
    reconnection: false,
    timeout: 5000
});

socket.on('connect', () => {
    console.log(' ¡CONEXIÓN EXITOSA!');
    console.log('   Socket ID:', socket.id);
    console.log('   URL:', SERVER_URL);
    
    // Probar autenticación
    console.log('\n Probando autenticación...');
    socket.emit('authenticate', {
        userId: 999,
        username: 'TestUser'
    });
});

socket.on('authenticated', (data) => {
    console.log(' AUTENTICACIÓN EXITOSA');
    console.log('   Datos:', JSON.stringify(data, null, 2));
    
    // Probar obtener salas
    console.log('\n Obteniendo lista de salas...');
    socket.emit('getRooms');
});

socket.on('roomsList', (rooms) => {
    console.log(' LISTA DE SALAS RECIBIDA');
    console.log(`   Total: ${rooms.length} salas`);
    if (rooms.length > 0) {
        console.log('   Salas:', JSON.stringify(rooms, null, 2));
    }
    
    console.log('\n ¡TODO FUNCIONA CORRECTAMENTE!');
    console.log(' El servidor está respondiendo bien\n');
    
    socket.disconnect();
    process.exit(0);
});

socket.on('connect_error', (error) => {
    console.error(' ERROR DE CONEXIÓN');
    console.error('   Mensaje:', error.message);
    console.error('\n Posibles causas:');
    console.error('   1. El servidor no está corriendo (npm run dev)');
    console.error('   2. La IP es incorrecta');
    console.error('   3. Firewall bloqueando la conexión');
    console.error('   4. El servidor está en otra red\n');
    process.exit(1);
});

socket.on('error', (error) => {
    console.error(' ERROR DEL SOCKET:', error);
});

socket.on('disconnect', (reason) => {
    console.log(' Desconectado. Razón:', reason);
});

// Timeout de seguridad
setTimeout(() => {
    if (!socket.connected) {
        console.error('\n TIMEOUT: No se pudo conectar después de 10 segundos');
        console.error('   Verifica que el servidor esté corriendo y la IP sea correcta\n');
        process.exit(1);
    }
}, 10000);