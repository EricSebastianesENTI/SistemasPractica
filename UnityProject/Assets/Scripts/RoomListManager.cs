using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;

public class RoomListManager : MonoBehaviour
{
    [Header("References")]
    [SerializeField] private GameClient gameClient;
    [SerializeField] private Transform roomListContent; // El Content del Scroll View
    [SerializeField] private GameObject roomButtonPrefab;

    [Header("Settings")]
    [SerializeField] private float refreshInterval = 3f; // Actualizar cada 3 segundos

    private float lastRefreshTime;
    private Dictionary<int, GameObject> roomButtons = new Dictionary<int, GameObject>();

    void Start()
    {
        // Suscribirse al evento de lista de salas del GameClient
        if (gameClient != null)
        {
            // Solicitar lista inicial
            gameClient.GetRoomsList();
            lastRefreshTime = Time.time;
        }
        else
        {
            Debug.LogError("GameClient no asignado en RoomListManager");
        }
    }

    void Update()
    {
        // Auto-refresh de la lista
        if (Time.time - lastRefreshTime >= refreshInterval)
        {
            RefreshRoomsList();
            lastRefreshTime = Time.time;
        }
    }

    public void RefreshRoomsList()
    {
        if (gameClient != null)
        {
            gameClient.GetRoomsList();
        }
    }

    // Este método será llamado por GameClient cuando reciba la lista
    public void OnRoomsListReceived(JArray roomsArray)
    {
        try
        {
            // ============ DEBUG COMPLETO ============
            Debug.Log("=== DEBUG INICIO ===");
            Debug.Log($"roomsArray es null? {roomsArray == null}");

            if (roomsArray == null)
            {
                Debug.LogError("roomsArray es NULL!");
                return;
            }

            Debug.Log($"Tipo de roomsArray: {roomsArray.GetType()}");
            Debug.Log($"Count: {roomsArray.Count}");
            Debug.Log($"JSON Raw completo:\n{roomsArray.ToString(Newtonsoft.Json.Formatting.Indented)}");

            if (roomsArray.Count > 0)
            {
                var firstRoom = roomsArray[0];
                Debug.Log($"=== PRIMERA SALA ===");
                Debug.Log($"Primera sala completa: {firstRoom.ToString()}");
                Debug.Log($"Tipo de firstRoom: {firstRoom.GetType()}");

                // Verificar cada campo individualmente
                Debug.Log($"ID existe? {firstRoom["id"] != null}");
                if (firstRoom["id"] != null)
                {
                    Debug.Log($"ID tipo: {firstRoom["id"].GetType()}");
                    Debug.Log($"ID valor: {firstRoom["id"]}");
                }

                Debug.Log($"name existe? {firstRoom["name"] != null}");
                if (firstRoom["name"] != null)
                {
                    Debug.Log($"name tipo: {firstRoom["name"].GetType()}");
                    Debug.Log($"name valor: {firstRoom["name"]}");
                }
            }
            Debug.Log("=== DEBUG FIN ===\n");
            // ============ FIN DEBUG ============

            Debug.Log($"Recibidas {roomsArray.Count} salas");

            // IDs de salas actuales en el servidor
            HashSet<int> currentRoomIds = new HashSet<int>();

            foreach (JObject roomObj in roomsArray)
            {
                Debug.Log($"Procesando sala: {roomObj.ToString()}");

                // MÉTODO 1: Casting seguro con Value<T>
                int roomId = roomObj.Value<int>("id");
                string roomName = roomObj.Value<string>("name");
                string status = roomObj.Value<string>("status");
                int playersCount = roomObj.Value<int>("playersCount");
                int viewersCount = roomObj.Value<int>("viewersCount");

                Debug.Log($"Sala parseada: ID={roomId}, Name={roomName}, Status={status}");

                currentRoomIds.Add(roomId);

                // Actualizar o crear botón
                if (roomButtons.ContainsKey(roomId))
                {
                    // Actualizar botón existente
                    UpdateRoomButton(roomButtons[roomId], roomId, roomName, status, playersCount, viewersCount);
                }
                else
                {
                    // Crear nuevo botón
                    GameObject newButton = CreateRoomButton(roomId, roomName, status, playersCount, viewersCount);
                    roomButtons[roomId] = newButton;
                }
            }

            // Eliminar salas que ya no existen
            List<int> toRemove = new List<int>();
            foreach (var kvp in roomButtons)
            {
                if (!currentRoomIds.Contains(kvp.Key))
                {
                    Destroy(kvp.Value);
                    toRemove.Add(kvp.Key);
                }
            }

            foreach (int id in toRemove)
            {
                roomButtons.Remove(id);
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError("Error procesando lista de salas: " + ex.Message);
            Debug.LogError("Stack trace: " + ex.StackTrace);

            // Si es InvalidCastException, mostrar más info
            if (ex is System.InvalidCastException)
            {
                Debug.LogError("CAST INVÁLIDO DETECTADO!");
                Debug.LogError("Probablemente el servidor está enviando datos en formato incorrecto");
            }
        }
    }

    GameObject CreateRoomButton(int roomId, string roomName, string status, int playersCount, int viewersCount)
    {
        GameObject buttonObj = Instantiate(roomButtonPrefab, roomListContent);

        // Configurar componente RoomButton
        RoomButton roomButton = buttonObj.GetComponent<RoomButton>();
        if (roomButton != null)
        {
            roomButton.Setup(roomId, roomName, status, playersCount, viewersCount, gameClient);
        }

        return buttonObj;
    }

    void UpdateRoomButton(GameObject buttonObj, int roomId, string roomName, string status, int playersCount, int viewersCount)
    {
        RoomButton roomButton = buttonObj.GetComponent<RoomButton>();
        if (roomButton != null)
        {
            roomButton.UpdateInfo(roomName, status, playersCount, viewersCount);
        }
    }

    public void ClearRoomsList()
    {
        foreach (var button in roomButtons.Values)
        {
            Destroy(button);
        }
        roomButtons.Clear();
    }
}