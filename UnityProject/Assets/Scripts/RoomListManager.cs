using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;

public class RoomListManager : MonoBehaviour
{
    [Header("References")]
    [SerializeField] private GameClient gameClient;
    [SerializeField] private Transform roomListContent; 
    [SerializeField] private GameObject roomButtonPrefab;

    [Header("Settings")]
    [SerializeField] private float refreshInterval = 3f; 

    private float lastRefreshTime;
    private Dictionary<int, GameObject> roomButtons = new Dictionary<int, GameObject>();

    void Start()
    {
        if (gameClient != null)
        {
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

    public void OnRoomsListReceived(JArray roomsArray)
    {
        try
        {
            Debug.Log($"Recibidas {roomsArray.Count} salas");

            HashSet<int> currentRoomIds = new HashSet<int>();

            foreach (JObject roomObj in roomsArray)
            {
                int roomId = roomObj["id"].Value<int>();
                string roomName = roomObj["name"].Value<string>();
                string status = roomObj["status"].Value<string>();
                int playersCount = roomObj["playersCount"].Value<int>();
                int viewersCount = roomObj["viewersCount"].Value<int>();

                currentRoomIds.Add(roomId);

                if (roomButtons.ContainsKey(roomId))
                {
                    UpdateRoomButton(roomButtons[roomId], roomId, roomName, status, playersCount, viewersCount);
                }
                else
                {
                    GameObject newButton = CreateRoomButton(roomId, roomName, status, playersCount, viewersCount);
                    roomButtons[roomId] = newButton;
                }
            }

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