USE mydb;

-- Ver lo que sea, depende dle nombvre de la variable
SELECT * FROM Users;

SELECT * FROM GameRooms;

SELECT * FROM GameReplays;

CALL LoginUser('Player1', 'pass123');
CALL LoginUser('Player1', 'wrong_pass');

-- Ver salas con información completa
SELECT 
    gr.*,
    u1.username as player1,
    u2.username as player2
FROM GameRooms gr
LEFT JOIN Users u1 ON gr.player1_id = u1.id
LEFT JOIN Users u2 ON gr.player2_id = u2.id;