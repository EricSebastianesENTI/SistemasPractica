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
            Debug.Log($"Recibidas {roomsArray.Count} salas");

            // IDs de salas actuales en el servidor
            HashSet<int> currentRoomIds = new HashSet<int>();

            foreach (JObject roomObj in roomsArray)
            {
                int roomId = (int)roomObj["id"];
                string roomName = (string)roomObj["name"];
                string status = (string)roomObj["status"];
                int playersCount = (int)roomObj["playersCount"];
                int viewersCount = (int)roomObj["viewersCount"];

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