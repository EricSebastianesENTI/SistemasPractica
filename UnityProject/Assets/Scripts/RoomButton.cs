using UnityEngine;
using UnityEngine.UI;
using TMPro;
using UnityEngine.EventSystems;

public class RoomButton : MonoBehaviour, IPointerClickHandler
{
    public string roomName = "";

    public void OnPointerClick(PointerEventData eventData)
    {
        // Verificación de seguridad
        if (GameClient.Instance == null)
        {
            Debug.LogError("GameClient.Instance es null! Asegúrate de que GameClient esté en la escena.");
            return;
        }

        if (string.IsNullOrEmpty(roomName))
        {
            Debug.LogError("RoomName está vacío!");
            return;
        }

        Debug.Log($"Intentando unirse a sala: {roomName}");
        GameClient.Instance.JoinRoomByName(roomName);
        GameClient.Instance.currentRoomName = roomName;
    }
}