using UnityEngine;
using UnityEngine.UI;
using TMPro;
using UnityEngine.EventSystems;

public class RoomButton : MonoBehaviour, IPointerClickHandler
{
    public string roomName = "";

    public void OnPointerClick(PointerEventData eventData)
    {

        Debug.Log($"Intentando unirse a sala: {roomName}");
        GameClient.Instance.JoinRoomByName(roomName);
        GameClient.Instance.currentRoomName = roomName;
        SceneController.Instance.ShowReturn();
    }
}