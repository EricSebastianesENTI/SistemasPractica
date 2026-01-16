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
        if (sceneController != null)
        {
            Debug.Log("SceneController found");
        }
        else
        {
            Debug.LogError("SceneController not found!");
        }
    }
    public void OnPointerClick(PointerEventData eventData)
    {
        GameClient.Instance.ExitRoom(GameClient.Instance.currentRoomName);
        sceneController.ShowSalas();
    }
}

