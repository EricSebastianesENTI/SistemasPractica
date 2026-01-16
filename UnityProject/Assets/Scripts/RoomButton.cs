using UnityEngine;
using UnityEngine.UI;
using TMPro;
using UnityEngine.EventSystems;

public class RoomButton : MonoBehaviour, IPointerClickHandler
{
    public string roomName = "";

    public void OnPointerClick(PointerEventData eventData)
    {        
       GameClient.Instance.JoinRoom(roomName);
       GameClient.Instance.currentRoomName = roomName;
    }
}