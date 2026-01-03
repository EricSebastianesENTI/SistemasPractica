-- ============================================
-- QUERIES DE PRUEBA
-- ============================================

USE mydb;

-- Ver todos los usuarios
SELECT * FROM Users;

-- Ver todas las salas
SELECT * FROM GameRooms;

-- Ver todos los replays
SELECT * FROM GameReplays;

-- Probar login correcto
CALL LoginUser('Player1', 'pass123');

-- Probar login incorrecto
CALL LoginUser('Player1', 'wrong_pass');

-- Ver salas con información completa
SELECT 
    gr.*,
    u1.username as player1,
    u2.username as player2
FROM GameRooms gr
LEFT JOIN Users u1 ON gr.player1_id = u1.id
LEFT JOIN Users u2 ON gr.player2_id = u2.id;