USE mydb;

-- Descomentar esto para volver a ejecutar el código porque el mierda no funciona si lo ejecutas una vez
/*
DROP TABLE IF EXISTS GameReplays;
DROP TABLE IF EXISTS GameRooms;
DROP TABLE IF EXISTS Users;
*/

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS Users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(45) NOT NULL,
    password VARCHAR(45) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE INDEX username_UNIQUE (username ASC)
) ENGINE = InnoDB;

-- Tabla de Salas del Juego
CREATE TABLE IF NOT EXISTS GameRooms (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    status ENUM('waiting', 'playing', 'finished') DEFAULT 'waiting',
    player1_id INT UNSIGNED,
    player2_id INT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_status (status ASC),
    CONSTRAINT fk_room_player1 
        FOREIGN KEY (player1_id) 
        REFERENCES Users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_room_player2 
        FOREIGN KEY (player2_id) 
        REFERENCES Users(id)
        ON DELETE SET NULL
) ENGINE = InnoDB;

-- Tabla de Replays (Partidas Guardadas)
CREATE TABLE IF NOT EXISTS GameReplays (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    room_id INT UNSIGNED NOT NULL,
    player1_id INT UNSIGNED NOT NULL,
    player2_id INT UNSIGNED NOT NULL,
    winner_id INT UNSIGNED,
    gameplay_data JSON NOT NULL,
    duration_seconds INT,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_replay_date (played_at DESC),
    CONSTRAINT fk_replay_room 
        FOREIGN KEY (room_id) 
        REFERENCES GameRooms(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_replay_player1 
        FOREIGN KEY (player1_id) 
        REFERENCES Users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_replay_player2 
        FOREIGN KEY (player2_id) 
        REFERENCES Users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_replay_winner 
        FOREIGN KEY (winner_id) 
        REFERENCES Users(id)
        ON DELETE SET NULL
) ENGINE = InnoDB;

-- las funciones

-- Limpiar procedures existentes porque si no peta
DROP PROCEDURE IF EXISTS CreateUser;
DROP PROCEDURE IF EXISTS LoginUser;
DROP PROCEDURE IF EXISTS CreateGameRoom;
DROP PROCEDURE IF EXISTS JoinGameRoom;
DROP PROCEDURE IF EXISTS GetAvailableRooms;
DROP PROCEDURE IF EXISTS SaveGameReplay;
DROP PROCEDURE IF EXISTS GetReplaysList;
DROP PROCEDURE IF EXISTS GetReplayData;


DELIMITER //
CREATE PROCEDURE CreateUser(
    IN newUsername VARCHAR(45),
    IN newPassword VARCHAR(45)
)
mainFunc: BEGIN
    DECLARE existingUsers INT DEFAULT 0;
    
    -- Comprobar que no nos meten una contraseña vacia
    IF newUsername = '' OR newPassword = '' THEN
        SELECT 'error' as status, 'Username or password cannot be blank' as message;
        LEAVE mainFunc;
    END IF;
    
    -- Verificar si el usuario ya existe
    SELECT COUNT(*) INTO existingUsers 
    FROM Users 
    WHERE username = newUsername;
    
    IF existingUsers != 0 THEN
        SELECT 'error' as status, 'Username already exists' as message;
        LEAVE mainFunc;
    END IF;
    
    -- Crear el usuario
    INSERT INTO Users(username, password) 
    VALUES(newUsername, newPassword);
    
    -- Retornar el ID del nuevo usuario
    SELECT 'success' as status, 
           'User created successfully' as message,
           LAST_INSERT_ID() as userId;
END //
DELIMITER ;

-- login del usuario
DELIMITER //
CREATE PROCEDURE LoginUser(
    IN p_username VARCHAR(45),
    IN p_password VARCHAR(45)
)
BEGIN
    DECLARE userCount INT DEFAULT 0;
    
    SELECT COUNT(*) INTO userCount
    FROM Users
    WHERE username = p_username 
    AND password = p_password;
    
    IF userCount = 0 THEN
        SELECT 'error' as status, 
               'Invalid username or password' as message;
    ELSE
        SELECT 'success' as status,
               id as userId,
               username,
               created_at
        FROM Users
        WHERE username = p_username 
        AND password = p_password;
    END IF;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE CreateGameRoom(
    IN p_name VARCHAR(100),
    IN p_player1_id INT UNSIGNED
)
BEGIN
    INSERT INTO GameRooms(name, player1_id, status)
    VALUES(p_name, p_player1_id, 'waiting');
    
    SELECT 'success' as status,
           LAST_INSERT_ID() as roomId,
           p_name as roomName;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE JoinGameRoom(
    IN p_room_id INT UNSIGNED,
    IN p_player2_id INT UNSIGNED
)
BEGIN
    DECLARE roomStatus VARCHAR(20);
    DECLARE currentPlayer2 INT;
    
    -- Verificar estado de la sala
    SELECT status, player2_id INTO roomStatus, currentPlayer2
    FROM GameRooms
    WHERE id = p_room_id;
    
    IF roomStatus IS NULL THEN
        SELECT 'error' as status, 'Room not found' as message;
    ELSEIF roomStatus != 'waiting' THEN
        SELECT 'error' as status, 'Room is not available' as message;
    ELSEIF currentPlayer2 IS NOT NULL THEN
        SELECT 'error' as status, 'Room is full' as message;
    ELSE
        -- Unirse a la sala
        UPDATE GameRooms
        SET player2_id = p_player2_id,
            status = 'playing'
        WHERE id = p_room_id;
        
        SELECT 'success' as status,
               p_room_id as roomId,
               'Joined room successfully' as message;
    END IF;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE GetAvailableRooms()
BEGIN
    SELECT 
        gr.id as roomId,
        gr.name as roomName,
        gr.status,
        u1.username as player1Name,
        u2.username as player2Name,
        gr.created_at
    FROM GameRooms gr
    LEFT JOIN Users u1 ON gr.player1_id = u1.id
    LEFT JOIN Users u2 ON gr.player2_id = u2.id
    WHERE gr.status IN ('waiting', 'playing')
    ORDER BY gr.created_at DESC;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE SaveGameReplay(
    IN p_room_id INT UNSIGNED,
    IN p_player1_id INT UNSIGNED,
    IN p_player2_id INT UNSIGNED,
    IN p_winner_id INT UNSIGNED,
    IN p_gameplay_data JSON,
    IN p_duration_seconds INT
)
BEGIN
    -- Guardar el replay
    INSERT INTO GameReplays(
        room_id,
        player1_id,
        player2_id,
        winner_id,
        gameplay_data,
        duration_seconds
    ) VALUES(
        p_room_id,
        p_player1_id,
        p_player2_id,
        p_winner_id,
        p_gameplay_data,
        p_duration_seconds
    );
    
    -- Actualizar estado de la sala
    UPDATE GameRooms
    SET status = 'finished'
    WHERE id = p_room_id;
    
    SELECT 'success' as status,
           LAST_INSERT_ID() as replayId,
           'Replay saved successfully' as message;
END //
DELIMITER ;


DELIMITER //
CREATE PROCEDURE GetReplaysList()
BEGIN
    SELECT 
        gr.id as replayId,
        groom.name as roomName,
        u1.username as player1Name,
        u2.username as player2Name,
        uw.username as winnerName,
        gr.duration_seconds,
        gr.played_at
    FROM GameReplays gr
    INNER JOIN GameRooms groom ON gr.room_id = groom.id
    INNER JOIN Users u1 ON gr.player1_id = u1.id
    INNER JOIN Users u2 ON gr.player2_id = u2.id
    LEFT JOIN Users uw ON gr.winner_id = uw.id
    ORDER BY gr.played_at DESC
    LIMIT 50;
END //
DELIMITER ;


DELIMITER //
CREATE PROCEDURE GetReplayData(
    IN p_replay_id INT UNSIGNED
)
BEGIN
    SELECT 
        gr.id as replayId,
        gr.room_id as roomId,
        u1.username as player1Name,
        u2.username as player2Name,
        uw.username as winnerName,
        gr.gameplay_data,
        gr.duration_seconds,
        gr.played_at
    FROM GameReplays gr
    INNER JOIN Users u1 ON gr.player1_id = u1.id
    INNER JOIN Users u2 ON gr.player2_id = u2.id
    LEFT JOIN Users uw ON gr.winner_id = uw.id
    WHERE gr.id = p_replay_id;
END //
DELIMITER ;

-- ============================================
-- PASO 4: DATOS DE PRUEBA
-- ============================================

-- Crear usuarios de prueba
CALL CreateUser('Player1', 'pass123');
CALL CreateUser('Player2', 'pass456');
CALL CreateUser('Player3', 'pass789');

-- Crear salas de prueba
CALL CreateGameRoom('Sala Epic', 1);
CALL CreateGameRoom('Sala Pro', 2);

-- Unirse a una sala
CALL JoinGameRoom(1, 2);

-- Ver salas disponibles
CALL GetAvailableRooms();

-- Guardar un replay de ejemplo
CALL SaveGameReplay(
    1,
    1,
    2,
    1,
    '{"moves": [{"time": 0, "player": 1, "action": "move_left", "grid": []}, {"time": 1, "player": 2, "action": "rotate", "grid": []}]}',
    180
);

-- Ver replays
CALL GetReplaysList();

-- Ver replay específico
CALL GetReplayData(1);

SELECT 'Database setup completed successfully!' as message;