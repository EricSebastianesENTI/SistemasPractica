// ============================================
// SCRIPT DE PRUEBA - Base de Datos
// Ejecuta: node src/testDB.js
// ============================================

const mysql = require("mysql2");
const dbHelpers = require("./dbHelpers");

// Crear conexión
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "user",  //  Pon tu contraseña aquí
    database: "mydb"
});

// Función principal de prueba
async function testDatabase() {
    console.log("\n Iniciando pruebas de base de datos...\n");

    try {
        // Conectar
        await new Promise((resolve, reject) => {
            connection.connect((error) => {
                if (error) reject(error);
                else resolve();
            });
        });
        console.log(" Conectado a la base de datos");

        // ==========================================
        // PRUEBA 1: Crear Usuario
        // ==========================================
        console.log("\n PRUEBA 1: Crear Usuario");
        const newUser = await dbHelpers.createUser(connection, "TestUser_" + Date.now(), "testpass123");
        console.log("Resultado:", newUser);

        if (newUser.status === 'success') {
            console.log(" Usuario creado con ID:", newUser.userId);
        } else {
            console.log(" Error:", newUser.message);
        }

        // ==========================================
        // PRUEBA 2: Login Correcto
        // ==========================================
        console.log("\n PRUEBA 2: Login Correcto");
        const login1 = await dbHelpers.loginUser(connection, "Player1", "pass123");
        console.log("Resultado:", login1);

        if (login1.status === 'success') {
            console.log(" Login exitoso. UserId:", login1.userId);
        }

        // ==========================================
        // PRUEBA 3: Login Incorrecto
        // ==========================================
        console.log("\n PRUEBA 3: Login Incorrecto");
        const login2 = await dbHelpers.loginUser(connection, "Player1", "wrong_password");
        console.log("Resultado:", login2);

        // ==========================================
        // PRUEBA 4: Crear Sala
        // ==========================================
        console.log("\n PRUEBA 4: Crear Sala");
        const newRoom = await dbHelpers.createGameRoom(connection, "Sala de Prueba", 1);
        console.log("Resultado:", newRoom);

        if (newRoom.status === 'success') {
            console.log(" Sala creada con ID:", newRoom.roomId);
        }

        // ==========================================
        // PRUEBA 5: Listar Salas
        // ==========================================
        console.log("\n PRUEBA 5: Listar Salas Disponibles");
        const rooms = await dbHelpers.getAvailableRooms(connection);
        console.log(`Encontradas ${rooms.length} salas:`);
        rooms.forEach(room => {
            console.log(`  - ${room.roomName} (${room.status}) - P1: ${room.player1Name}, P2: ${room.player2Name || 'Esperando...'}`);
        });

        // ==========================================
        // PRUEBA 6: Unirse a Sala
        // ==========================================
        if (newRoom.status === 'success') {
            console.log("\n PRUEBA 6: Unirse a Sala");
            const joinResult = await dbHelpers.joinGameRoom(connection, newRoom.roomId, 2);
            console.log("Resultado:", joinResult);
        }

        // ==========================================
        // PRUEBA 7: Guardar Replay
        // ==========================================
        console.log("\nPRUEBA 7: Guardar Replay");
        const gameplayData = {
            moves: [
                { time: 0, player: 1, action: "move_left" },
                { time: 1, player: 2, action: "rotate" },
                { time: 2, player: 1, action: "drop" }
            ]
        };

        const replayResult = await dbHelpers.saveGameReplay(
            connection,
            1,  // roomId
            1,  // player1Id
            2,  // player2Id
            1,  // winnerId
            gameplayData,
            120  // duration
        );
        console.log("Resultado:", replayResult);

        // ==========================================
        // PRUEBA 8: Listar Replays
        // ==========================================
        console.log("\n PRUEBA 8: Listar Replays");
        const replays = await dbHelpers.getReplaysList(connection);
        console.log(`Encontrados ${replays.length} replays:`);
        replays.forEach(replay => {
            console.log(`  - ID ${replay.replayId}: ${replay.player1Name} vs ${replay.player2Name} (Winner: ${replay.winnerName || 'N/A'})`);
        });

        // ==========================================
        // PRUEBA 9: Obtener Replay Específico
        // ==========================================
        if (replays.length > 0) {
            console.log("\n PRUEBA 9: Obtener Replay Específico");
            const replayData = await dbHelpers.getReplayData(connection, replays[0].replayId);
            console.log("Replay:", {
                id: replayData.replayId,
                players: `${replayData.player1Name} vs ${replayData.player2Name}`,
                winner: replayData.winnerName,
                moves: replayData.gameplay_data.moves.length
            });
        }

        console.log("\n Todas las pruebas completadas!\n");

    } catch (error) {
        console.error("\n Error durante las pruebas:", error);
    } finally {
        connection.end();
        console.log(" Conexión cerrada");
    }
}

// Ejecutar pruebas
testDatabase();