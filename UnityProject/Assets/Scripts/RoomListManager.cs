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
            Debug.LogError(" GameClient no asignado en RoomListManager");
        }
    }

    void Update()
    {
        if (Time.time - lastRefreshTime >= refreshInterval)
        {
            RefreshRoomsList();
            lastRefreshTime = Time.time;

        }
        if(createButton)
        {
            foreach (string i in array)
            {
                Instantiate(roomButtonPrefab, roomListContent);
            }
            createButton = false;
        }

    }

    public void RefreshRoomsList()
    {
        if (gameClient != null)
        {
            gameClient.GetRoomsList();
        }
    }
    string[] array;
    bool createButton = false;

    public void OnRoomsListReceived(string[] roomsArray)
    {
        array = (string[])roomsArray.Clone();
        createButton = true;
    }

    GameObject CreateRoomButton(int roomId, string roomName, string status, int playersCount, int viewersCount)
    {
        try
        {
            if (roomButtonPrefab == null)
            {
                Debug.LogError(" roomButtonPrefab no está asignado en el Inspector!");
                return null;
            }

            if (roomListContent == null)
            {
                Debug.LogError(" roomListContent no está asignado en el Inspector!");
                return null;
            }

            GameObject buttonObj = Instantiate(roomButtonPrefab, roomListContent);

            RoomButton roomButton = buttonObj.GetComponent<RoomButton>();
            if (roomButton != null)
            {
                roomButton.Setup(roomId, roomName, status, playersCount, viewersCount, gameClient);
                Debug.Log($" Botón creado para sala: {roomName}");
            }
            else
            {
                Debug.LogError("RoomButton component no encontrado en el prefab!");
            }

            return buttonObj;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"Error creando botón: {ex.Message}");
            return null;
        }
    }

    void UpdateRoomButton(GameObject buttonObj, int roomId, string roomName, string status, int playersCount, int viewersCount)
    {
        try
        {
            RoomButton roomButton = buttonObj.GetComponent<RoomButton>();
            if (roomButton != null)
            {
                roomButton.UpdateInfo(roomName, status, playersCount, viewersCount);
            }
            else
            {
                Debug.LogError("RoomButton component no encontrado al actualizar!");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"Error actualizando botón: {ex.Message}");
        }
    }

    public void ClearRoomsList()
    {
        foreach (var button in roomButtons.Values)
        {
            if (button != null)
            {
                Destroy(button);
            }
        }
        roomButtons.Clear();
        Debug.Log("Lista de salas limpiada");
    }
}