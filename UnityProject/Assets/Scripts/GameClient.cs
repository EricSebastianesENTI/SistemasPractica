using UnityEngine;
using SocketIOClient;
using System;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;

public class GameClient : MonoBehaviour
{
    [Header("Connection Settings")]
    [SerializeField] private string serverUrl = "http://10.0.2.15:3000/";
    [SerializeField] private NodeGrid nodeGrid; // Referencia al NodeGrid

    [Header("References")]
    [SerializeField] private NodeGrid nodeGrid;

    private SocketIOUnity socket;
    private int currentRoomId;
    private bool gridInitialized = false;

    void Start()
    {
        ConnectToServer();
    }

    void ConnectToServer()
    {
        Uri uri = new Uri(serverUrl);
        socket = new SocketIOUnity(uri);

        // Eventos de conexión
        socket.OnConnected += OnConnected;
        socket.OnDisconnected += OnDisconnected;

        // Eventos del juego
        socket.On("gameState", OnGameState);
        socket.On("gameStarted", OnGameStarted);
        socket.On("gamePaused", OnGamePaused);
        socket.On("gameResumed", OnGameResumed);
        socket.On("gameOver", OnGameOver);

        // Eventos de salas
        socket.On("roomsList", OnRoomsList);
        socket.On("roomJoined", OnRoomJoined);
        socket.On("authenticated", OnAuthenticated);

        socket.Connect();
    }

    void OnConnected(object sender, EventArgs e)
    {
        Debug.Log("Conectado al servidor");

        // Autenticarse
        socket.Emit("authenticate", new
        {
            userId = UnityEngine.Random.Range(10000, 99999),
            username = this.username
        });
    }

    void OnDisconnected(object sender, string reason)
    {
        Debug.Log("Desconectado del servidor. Razón: " + reason);
        gridInitialized = false;
    }

    void OnAuthenticated(SocketIOResponse response)
    {
        Debug.Log("Autenticado en el servidor");

        // Solicitar lista de salas
        GetRoomsList();
    }

    void OnGameState(SocketIOResponse response)
    {
        try
        {
            string json = response.ToString();
            Debug.Log("Game State recibido");

            // Parsear con JObject para manejar el Dictionary
            JObject gameStateObj = JObject.Parse(json);

            // Inicializar grid si es la primera vez
            if (!gridInitialized)
            {
                NodeGrid.GridSetup setup = new NodeGrid.GridSetup
                {
                    playerId = 0,
                    playerName = "Player 1",
                    sizeX = 6,
                    sizeY = 13
                };

                nodeGrid.SetupGrid(setup);
                gridInitialized = true;
            }

            // Actualizar grids
            if (gameStateObj["grids"] != null)
            {
                JObject gridsObj = (JObject)gameStateObj["grids"];

                foreach (var kvp in gridsObj)
                {
                    string playerIdStr = kvp.Key;
                    JArray nodesArray = (JArray)kvp.Value;

                    List<NodeGrid.Node> nodes = new List<NodeGrid.Node>();

                    foreach (JObject nodeObj in nodesArray)
                    {
                        NodeGrid.Node node = new NodeGrid.Node(
                            (NodeGrid.Node.JewelType)(int)nodeObj["type"],
                            (int)nodeObj["x"],
                            (int)nodeObj["y"]
                        );
                        nodes.Add(node);
                    }

                    NodeGrid.GridUpdate update = new NodeGrid.GridUpdate
                    {
                        playerId = int.Parse(playerIdStr),
                        updatedNodes = nodes
                    };

                    nodeGrid.UpdateGrid(update);
                }
            }
        }
        catch (Exception ex)
        {
            Debug.LogError("? Error parseando gameState: " + ex.Message);
        }
    }

    void OnGameStarted(SocketIOResponse response)
    {
        Debug.Log("¡Juego iniciado!");
    }

    void OnGamePaused(SocketIOResponse response)
    {
        Debug.Log("Juego pausado");
    }

    void OnGameResumed(SocketIOResponse response)
    {
        Debug.Log("Juego reanudado");
    }

    void OnGameOver(SocketIOResponse response)
    {
        Debug.Log("Game Over: " + response.ToString());
    }

    void OnRoomsList(SocketIOResponse response)
    {
        Debug.Log("Lista de salas recibida: " + response.ToString());
    }

    void OnRoomJoined(SocketIOResponse response)
    {
        Debug.Log("Unido a sala: " + response.ToString());
    }

    // MÉTODOS PÚBLICOS

    public void JoinRoomAsViewer(int roomId)
    {
        currentRoomId = roomId;
        gridInitialized = false; // Reset para nueva sala

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
            gridInitialized = false;
        }
    }

    void OnDestroy()
    {
        if (socket != null)
        {
            socket.Disconnect();
        }
    }

    // Para testear desde el inspector
    [ContextMenu("Join Room 1")]
    void TestJoinRoom()
    {
        JoinRoomAsViewer(1);
    }

    [ContextMenu("Get Rooms")]
    void TestGetRooms()
    {
        GetRoomsList();
    }
}