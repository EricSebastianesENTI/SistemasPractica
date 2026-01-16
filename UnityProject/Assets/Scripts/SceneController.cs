using UnityEngine;

public class SceneController : MonoBehaviour
{
    [SerializeField] GameObject salas;
    [SerializeField] GameObject replays;
    [SerializeField] GameObject returnBut;

    private void Start()
    {
        ShowSalas();
    }


    public void ShowSalas()
    {
        salas.SetActive(true);
        replays.SetActive(true);
        returnBut.SetActive(false);
    }
    public void ShowReturn()
    {
        salas.SetActive(false);
        replays.SetActive(false);
        returnBut.SetActive(true);
    }
}
