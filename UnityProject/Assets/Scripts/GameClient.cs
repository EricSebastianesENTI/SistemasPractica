using UnityEngine;
using SocketIOClient;
using System;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;

public class GameClient : MonoBehaviour
{
    [Header("Connection Settings")]
    [SerializeField] private string serverUrl = "http://192.168.1.56:3000/";

    [Header("References")]
    [SerializeField] private NodeGrid nodeGrid;
    [SerializeField] private ScoreUI scoreUI;
    [SerializeField] private RoomListManager roomListManager;

    private SocketIOUnity socket;
    private int currentRoomId;
    private Dictionary<int, PlayerGameData> playersData = new Dictionary<int, PlayerGameData>();
    private bool isConnected = false; // NUEVO: Flag de conexión

    private class PlayerGameData
    {
        public int playerId;
        public string username;
        public int score;
        public bool gridInitialized;
    }

    void Start()
    {
        ConnectToServer();
    }

    void ConnectToServer()
    {
        try
        {
            Uri uri = new Uri(serverUrl);
            socket = new SocketIOUnity(uri);

            // Configurar eventos ANTES de conectar
            socket.OnConnected += OnConnected;
            socket.OnDisconnected += OnDisconnected;

            socket.On("gameInit", OnGameInit);
            socket.On("gameState", OnGameState);
            socket.On("gameStarted", OnGameStarted);
            socket.On("gamePaused", OnGamePaused);
            socket.On("gameResumed", OnGameResumed);
            socket.On("gameOver", OnGameOver);

            socket.On("roomsList", OnRoomsList);
            socket.On("roomJoined", OnRoomJoined);
            socket.On("authenticated", OnAuthenticated);

            Debug.Log($"Intentando conectar a: {serverUrl}");
            socket.Connect();
        }
        catch (Exception ex)
        {
            Debug.LogError($"Error al conectar al servidor: {ex.Message}");
            isConnected = false;
        }
    }

    void OnConnected(object sender, EventArgs e)
    {
        isConnected = true;
        Debug.Log(" Conectado al servidor correctamente");

        // Generar nombre de usuario Unity único
        string unityUsername = $"UnityViewer_{UnityEngine.Random.Range(1000, 9999)}";
        Debug.Log($"Autenticando como: {unityUsername}");

        socket.Emit("authenticate", new
        {
            userId = UnityEngine.Random.Range(10000, 99999),
            username = unityUsername
        });
    }

    void OnDisconnected(object sender, string reason)
    {
        isConnected = false;
        Debug.LogWarning($" Desconectado del servidor. Razón: {reason}");
        playersData.Clear();
    }

    void OnAuthenticated(SocketIOResponse response)
    {
        Debug.Log(" Autenticado en el servidor");

        // Ahora SÍ podemos pedir la lista de salas
        GetRoomsList();
    }

    void OnGameInit(SocketIOResponse response)
    {
        try
        {
            string json = response.ToString();
            Debug.Log($" Game Init recibido: {json}");

            JObject initData = JObject.Parse(json);

            int roomId = (int)initData["roomId"];
            JObject gridConfig = (JObject)initData["gridConfig"];
            JArray players = (JArray)initData["players"];

            int gridWidth = (int)gridConfig["width"];
            int gridHeight = (int)gridConfig["height"];

            Debug.Log($" Inicializando juego - Sala: {roomId}, Grid: {gridWidth}x{gridHeight}, Jugadores: {players.Count}");

            playersData.Clear();
            foreach (JObject playerObj in players)
            {
                int playerId = (int)playerObj["userId"];
                string username = (string)playerObj["username"];

                playersData[playerId] = new PlayerGameData
                {
                    playerId = playerId,
                    username = username,
                    score = 0,
                    gridInitialized = false
                };

                Debug.Log($" Jugador registrado: {username} (ID: {playerId})");
            }

            if (nodeGrid != null && players.Count > 0)
            {
                int firstPlayerId = (int)((JObject)players[0])["userId"];
                string firstPlayerName = (string)((JObject)players[0])["username"];

                NodeGrid.GridSetup setup = new NodeGrid.GridSetup
                {
                    playerId = firstPlayerId,
                    playerName = firstPlayerName,
                    sizeX = gridWidth,
                    sizeY = gridHeight
                };

                nodeGrid.SetupGrid(setup);

                if (playersData.ContainsKey(firstPlayerId))
                {
                    playersData[firstPlayerId].gridInitialized = true;
                }

                Debug.Log($" Grid inicializado para {firstPlayerName}");
            }
            else if (nodeGrid == null)
            {
                Debug.LogError(" NodeGrid no está asignado en el Inspector!");
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($" Error parseando gameInit: {ex.Message}\n{ex.StackTrace}");
        }
    }

    void OnGameState(SocketIOResponse response)
    {
        try
        {
            string json = response.ToString();
            JObject gameStateObj = JObject.Parse(json);

            string state = (string)gameStateObj["state"];
            bool isPaused = (bool)gameStateObj["isPaused"];
            int tickRate = (int)gameStateObj["tickRate"];

            JArray playersArray = (JArray)gameStateObj["players"];

            foreach (JObject playerObj in playersArray)
            {
                int playerId = (int)playerObj["playerId"];
                string username = (string)playerObj["username"];
                int score = (int)playerObj["score"];
                JArray gridNodes = (JArray)playerObj["grid"];
                JArray currentPiece = (JArray)playerObj["currentPiece"];

                if (playersData.ContainsKey(playerId))
                {
                    playersData[playerId].score = score;
                }

                if (scoreUI != null)
                {
                    scoreUI.UpdateScore(playerId, username, score);
                }

                if (playersData.ContainsKey(playerId) && playersData[playerId].gridInitialized)
                {
                    UpdateGridVisual(playerId, gridNodes, currentPiece);
                }
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($" Error parseando gameState: {ex.Message}");
        }
    }

    void UpdateGridVisual(int playerId, JArray gridNodes, JArray currentPiece)
    {
        if (nodeGrid == null)
        {
            Debug.LogError(" NodeGrid es null, no se puede actualizar visual");
            return;
        }

        List<NodeGrid.Node> nodes = new List<NodeGrid.Node>();

        foreach (JObject nodeObj in gridNodes)
        {
            NodeGrid.Node node = new NodeGrid.Node(
                (NodeGrid.Node.JewelType)(int)nodeObj["type"],
                (int)nodeObj["x"],
                (int)nodeObj["y"]
            );
            nodes.Add(node);
        }

        foreach (JObject pieceNodeObj in currentPiece)
        {
            NodeGrid.Node pieceNode = new NodeGrid.Node(
                (NodeGrid.Node.JewelType)(int)pieceNodeObj["type"],
                (int)pieceNodeObj["x"],
                (int)pieceNodeObj["y"]
            );
            nodes.Add(pieceNode);
        }

        NodeGrid.GridUpdate update = new NodeGrid.GridUpdate
        {
            playerId = playerId,
            updatedNodes = nodes
        };

        nodeGrid.UpdateGrid(update);
    }

    void OnGameStarted(SocketIOResponse response)
    {
        Debug.Log(" ¡Juego iniciado! " + response.ToString());
    }

    void OnGamePaused(SocketIOResponse response)
    {
        Debug.Log(" Juego pausado: " + response.ToString());
    }

    void OnGameResumed(SocketIOResponse response)
    {
        Debug.Log(" Juego reanudado");
    }

    void OnGameOver(SocketIOResponse response)
    {
        Debug.Log(" Game Over: " + response.ToString());

        try
        {
            JObject gameOverData = JObject.Parse(response.ToString());
            int winnerId = (int)gameOverData["winnerId"];
            int loserId = (int)gameOverData["loserId"];

            Debug.Log($" Ganador: {winnerId}, Perdedor: {loserId}");
        }
        catch (Exception ex)
        {
            Debug.LogError($" Error parseando gameOver: {ex.Message}");
        }
    }

    void OnRoomsList(SocketIOResponse response)
    {
        try
        {
            string json = response.ToString();
            Debug.Log($" Lista de salas recibida: {json}");

            JArray roomsArray = JArray.Parse(json);
            Debug.Log($" Total de salas: {roomsArray.Count}");

            // Notificar al RoomListManager
            if (roomListManager != null)
            {
                roomListManager.OnRoomsListReceived(roomsArray);
            }
            else
            {
                Debug.LogWarning(" RoomListManager no está asignado");
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($" Error parseando roomsList: {ex.Message}\n{ex.StackTrace}");
        }
    }

    void OnRoomJoined(SocketIOResponse response)
    {
        Debug.Log(" Unido a sala: " + response.ToString());
    }

    // MÉTODOS PÚBLICOS

    public void JoinRoomAsViewer(int roomId)
    {
        if (!isConnected || socket == null)
        {
            Debug.LogError(" No se puede unir a sala: Socket no conectado");
            return;
        }

        currentRoomId = roomId;
        playersData.Clear();

        Debug.Log($" Uniéndose a sala {roomId} como espectador...");
        socket.Emit("joinRoomAsViewer", new { roomId = roomId });
    }

    public void GetRoomsList()
    {
        if (!isConnected || socket == null)
        {
            Debug.LogWarning(" No se puede obtener lista de salas: Socket no conectado");
            return;
        }

        Debug.Log(" Solicitando lista de salas...");
        socket.Emit("getRooms");
    }

    public void LeaveCurrentRoom()
    {
        if (!isConnected || socket == null)
        {
            Debug.LogWarning(" No se puede salir de sala: Socket no conectado");
            return;
        }

        if (currentRoomId > 0)
        {
            Debug.Log($" Saliendo de sala {currentRoomId}...");
            socket.Emit("leaveRoom", new { roomId = currentRoomId });
            currentRoomId = 0;
            playersData.Clear();
        }
    }

    void OnDestroy()
    {
        if (socket != null)
        {
            Debug.Log("Desconectando socket...");
            socket.Disconnect();
            socket = null;
        }
        isConnected = false;
    }

    void OnApplicationQuit()
    {
        OnDestroy();
    }

    // MÉTODOS DE DEBUG
    [ContextMenu("Test Connection")]
    void TestConnection()
    {
        Debug.Log($"Socket: {(socket != null ? "Creado" : "NULL")}");
        Debug.Log($"Conectado: {isConnected}");
        Debug.Log($"Server URL: {serverUrl}");
    }

    [ContextMenu("Force Get Rooms")]
    void ForceGetRooms()
    {
        GetRoomsList();
    }
}