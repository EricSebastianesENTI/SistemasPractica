using UnityEngine;
using UnityEngine.UI;
using TMPro;
using UnityEngine.EventSystems;

public class RoomButton : MonoBehaviour, IPointerClickHandler
{
    public string roomName = "";
    SceneController sceneController;
    void Start()
    {
        sceneController = GameObject.Find("SceneController").GetComponent<SceneController>();
    }
    public void OnPointerClick(PointerEventData eventData)
    {

        Debug.Log($"Intentando unirse a sala: {roomName}");
        GameClient.Instance.JoinRoomByName(roomName);
        GameClient.Instance.currentRoomName = roomName;
        sceneController.ShowReturn();
    }
}