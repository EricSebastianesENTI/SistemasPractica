using UnityEngine;

public class SceneController : MonoBehaviour
{
    [SerializeField] GameObject salas;
    [SerializeField] GameObject replays;
    [SerializeField] GameObject returnBut;
    public static SceneController Instance { get; private set; }
    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
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
