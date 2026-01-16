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
            foreach(Transform t in roomListContent)
            {
                Destroy(t.gameObject);
            }
            foreach (string i in array)
            {
                GameObject temp = Instantiate(roomButtonPrefab, roomListContent);
                temp.GetComponent<RoomButton>().roomName = i;
                temp.GetComponentInChildren<TextMeshProUGUI>().text = i;
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

}