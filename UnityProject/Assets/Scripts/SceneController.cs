using UnityEngine;

public class SceneController : MonoBehaviour
{
    [SerializeField] GameObject salas;
    [SerializeField] GameObject replays;
    [SerializeField] GameObject returnBut;
    public static SceneController Instance => instance;
    private static SceneController instance;
    void Awake()
    {
        if (instance == null)
        {
            instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
            return;
        }
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
