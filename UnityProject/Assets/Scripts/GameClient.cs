using UnityEngine;
using SocketIOClient;
using System;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;

public class GameClient : MonoBehaviour
{
    [Header("Connection Settings")]
    [SerializeField] private string serverUrl = "http://10.0.2.15:3000/";

    [Header("References")]
    [SerializeField] private NodeGrid nodeGrid;
    [SerializeField] private ScoreUI scoreUI;
    [SerializeField] private RoomListManager roomListManager; // NUEVO

    private SocketIOUnity socket;
    private int currentRoomId;
    private Dictionary<int, PlayerGameData> playersData = new Dictionary<int, PlayerGameData>();

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
        Uri uri = new Uri(serverUrl);
        socket = new SocketIOUnity(uri);

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

        socket.Connect();
    }

    void OnConnected(object sender, EventArgs e)
    {
        Debug.Log("Conectado al servidor");

        socket.Emit("authenticate", new
        {
            userId = UnityEngine.Random.Range(10000, 99999),
            username = "UnityViewer_" + UnityEngine.Random.Range(1, 1000)
        });
    }

    void OnDisconnected(object sender, string reason)
    {
        Debug.Log("Desconectado del servidor. Razón: " + reason);
        playersData.Clear();
    }

    void OnAuthenticated(SocketIOResponse response)
    {
        Debug.Log("Autenticado en el servidor");
        GetRoomsList();
    }

    void OnGameInit(SocketIOResponse response)
    {
        try
        {
            string json = response.ToString();
            Debug.Log("Game Init recibido: " + json);

            JObject initData = JObject.Parse(json);

            int roomId = (int)initData["roomId"];
            JObject gridConfig = (JObject)initData["gridConfig"];
            JArray players = (JArray)initData["players"];

            int gridWidth = (int)gridConfig["width"];
            int gridHeight = (int)gridConfig["height"];

            Debug.Log($"Inicializando juego - Sala: {roomId}, Grid: {gridWidth}x{gridHeight}, Jugadores: {players.Count}");

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

                Debug.Log($"Jugador registrado: {username} (ID: {playerId})");
            }

            if (players.Count > 0)
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

                Debug.Log("Grid inicializado para " + firstPlayerName);
            }
        }
        catch (Exception ex)
        {
            Debug.LogError("Error parseando gameInit: " + ex.Message);
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
            Debug.LogError("Error parseando gameState: " + ex.Message);
        }
    }

    void UpdateGridVisual(int playerId, JArray gridNodes, JArray currentPiece)
    {
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
        Debug.Log("¡Juego iniciado! " + response.ToString());
    }

    void OnGamePaused(SocketIOResponse response)
    {
        Debug.Log("Juego pausado: " + response.ToString());
    }

    void OnGameResumed(SocketIOResponse response)
    {
        Debug.Log("Juego reanudado");
    }

    void OnGameOver(SocketIOResponse response)
    {
        Debug.Log("Game Over: " + response.ToString());

        try
        {
            JObject gameOverData = JObject.Parse(response.ToString());
            int winnerId = (int)gameOverData["winnerId"];
            int loserId = (int)gameOverData["loserId"];

            Debug.Log($"Ganador: {winnerId}, Perdedor: {loserId}");
        }
        catch (Exception ex)
        {
            Debug.LogError("Error parseando gameOver: " + ex.Message);
        }
    }

    // MODIFICADO: Ahora notifica al RoomListManager
    void OnRoomsList(SocketIOResponse response)
    {
        Debug.Log("Lista de salas recibida: " + response.ToString());

        try
        {
            JArray roomsArray = JArray.Parse(response.ToString());

            // Notificar al RoomListManager
            if (roomListManager != null)
            {
                roomListManager.OnRoomsListReceived(roomsArray);
            }
        }
        catch (Exception ex)
        {
            Debug.LogError("Error parseando roomsList: " + ex.Message);
        }
    }

    void OnRoomJoined(SocketIOResponse response)
    {
        Debug.Log("Unido a sala: " + response.ToString());
    }

    public void JoinRoomAsViewer(int roomId)
    {
        currentRoomId = roomId;
        playersData.Clear();

        Debug.Log($"Uniéndose a sala {roomId} como espectador...");
        socket.Emit("joinRoomAsViewer", new { roomId = roomId });
    }

    public void GetRoomsList()
    {
        Debug.Log("Solicitando lista de salas...");
        socket.Emit("getRooms");
    }

    public void LeaveCurrentRoom()
    {
        if (currentRoomId > 0)
        {
            socket.Emit("leaveRoom", new { roomId = currentRoomId });
            currentRoomId = 0;
            playersData.Clear();
        }
    }

    void OnDestroy()
    {
        if (socket != null)
        {
            socket.Disconnect();
        }
    }
}