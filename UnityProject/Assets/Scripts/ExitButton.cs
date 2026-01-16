using UnityEngine;
using UnityEngine.UI;
using TMPro;
using UnityEngine.EventSystems;

public class ExitButton : MonoBehaviour, IPointerClickHandler
{
    SceneController sceneController;
    void Start()
    {
        sceneController = GameObject.Find("SceneController").GetComponent<SceneController>();
    }
    public void OnPointerClick(PointerEventData eventData)
    {
        GameClient.Instance.ExitRoom(GameClient.Instance.currentRoomName);
        sceneController.ShowSalas();
    }
}

