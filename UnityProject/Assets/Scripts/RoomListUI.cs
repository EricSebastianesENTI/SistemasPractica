using System.Collections.Generic;
using UnityEngine;

public class RoomListUI : MonoBehaviour
{
    [SerializeField] private GameClient gameClient;
    [SerializeField] private GameObject roomButtonPrefab;
    [SerializeField] private Transform roomListContainer;

    void Start()
    {
        gameClient.GetRoomsList();
    }

    public void OnRoomsListReceived(List<RoomData> rooms)
    {
        // Limpiar lista anterior
        foreach (Transform child in roomListContainer)
        {
            Destroy(child.gameObject);
        }

        foreach (var room in rooms)
        {
            GameObject btn = Instantiate(roomButtonPrefab, roomListContainer);
        }
    }
}