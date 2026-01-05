/**
 * Ejecuta un stored procedure de forma segura
 * @param {Object} connection - Conexión MySQL
 * @param {String} procedureName - Nombre del procedure
 * @param {Array} params - Parámetros del procedure
 * @returns {Promise} - Resultado de la query
 */
function callProcedure(connection, procedureName, params = []) {
    return new Promise((resolve, reject) => {
        const placeholders = params.map(() => '?').join(',');
        const query = `CALL ${procedureName}(${placeholders})`;
        
        connection.query(query, params, (error, results) => {
            if (error) {
                console.error(` Error en ${procedureName}:`, error.message);
                reject(error);
            } else {
                // Los stored procedures devuelven arrays de resultados
                // El primer elemento [0] contiene los datos
                resolve(results[0]);
            }
        });
    });
}

async function createUser(connection, username, password) {
    try {
        const result = await callProcedure(connection, 'CreateUser', [username, password]);
        return result[0]; // { status, message, userId }
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

async function loginUser(connection, username, password) {
    try {
        const result = await callProcedure(connection, 'LoginUser', [username, password]);
        return result[0]; // { status, userId, username, created_at } o { status, message }
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

async function createGameRoom(connection, roomName, player1Id) {
    try {
        const result = await callProcedure(connection, 'CreateGameRoom', [roomName, player1Id]);
        return result[0]; // { status, roomId, roomName }
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

async function joinGameRoom(connection, roomId, player2Id) {
    try {
        const result = await callProcedure(connection, 'JoinGameRoom', [roomId, player2Id]);
        return result[0]; // { status, roomId, message }
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

async function getAvailableRooms(connection) {
    try {
        const result = await callProcedure(connection, 'GetAvailableRooms', []);
        return result; // Array de salas
    } catch (error) {
        console.error('Error obteniendo salas:', error);
        return [];
    }
}

async function saveGameReplay(connection, roomId, player1Id, player2Id, winnerId, gameplayData, durationSeconds) {
    try {
        // Convertir gameplayData a JSON string si es un objeto
        const jsonData = typeof gameplayData === 'string' 
            ? gameplayData 
            : JSON.stringify(gameplayData);
            
        const result = await callProcedure(connection, 'SaveGameReplay', [
            roomId,
            player1Id,
            player2Id,
            winnerId,
            jsonData,
            durationSeconds
        ]);
        return result[0]; // { status, replayId, message }
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

async function getReplaysList(connection) {
    try {
        const result = await callProcedure(connection, 'GetReplaysList', []);
        return result; // Array de replays
    } catch (error) {
        console.error('Error obteniendo replays:', error);
        return [];
    }
}

async function getReplayData(connection, replayId) {
    try {
        const result = await callProcedure(connection, 'GetReplayData', [replayId]);
        
        if (result.length > 0) {
            // Parsear el JSON de gameplay_data
            const replay = result[0];
            if (replay.gameplay_data && typeof replay.gameplay_data === 'string') {
                replay.gameplay_data = JSON.parse(replay.gameplay_data);
            }
            return replay;
        }
        return null;
    } catch (error) {
        console.error('Error obteniendo replay:', error);
        return null;
    }
}

module.exports = {
    // Usuarios
    createUser,
    loginUser,
    
    // Salas
    createGameRoom,
    joinGameRoom,
    getAvailableRooms,
    
    // Replays
    saveGameReplay,
    getReplaysList,
    getReplayData
};