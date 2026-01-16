using System.Collections.Generic;
using UnityEngine;

public class RoomListUI : MonoBehaviour
{
    [SerializeField] private GameClient gameClient;
    [SerializeField] private GameObject roomButtonPrefab;
    [SerializeField] private Transform roomListContainer;

    void Start()
    {
        // Solicitar lista de salas
        gameClient.GetRoomsList();
    }

    public void OnRoomsListReceived(List<RoomData> rooms)
    {
        // Limpiar lista anterior
        foreach (Transform child in roomListContainer)
        {
            Destroy(child.gameObject);
        }

        // Crear botones para cada sala
        foreach (var room in rooms)
        {
            GameObject btn = Instantiate(roomButtonPrefab, roomListContainer);
            // Configurar botón con datos de la sala
            // btn.GetComponent<RoomButton>().Setup(room, gameClient);
        }
    }
}