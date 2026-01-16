using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class RoomButton : MonoBehaviour
{
    [Header("UI Elements")]
    [SerializeField] private TextMeshProUGUI roomNameText;
    [SerializeField] private TextMeshProUGUI statusText;
    [SerializeField] private TextMeshProUGUI playersText;
    [SerializeField] private TextMeshProUGUI viewersText;
    [SerializeField] private Button joinButton;
    [SerializeField] private Image backgroundImage;

    [Header("Status Colors")]
    [SerializeField] private Color waitingColor = new Color(0.3f, 0.6f, 0.3f);
    [SerializeField] private Color playingColor = new Color(0.6f, 0.3f, 0.3f);
    [SerializeField] private Color finishedColor = new Color(0.4f, 0.4f, 0.4f);

    private int roomId;
    private GameClient gameClient;
    private string currentStatus;

    void Awake()
    {
        if (joinButton != null)
        {
            joinButton.onClick.AddListener(OnJoinButtonClicked);
        }
    }

    public void Setup(int id, string roomName, string status, int playersCount, int viewersCount, GameClient client)
    {
        this.roomId = id;
        this.gameClient = client;
        this.currentStatus = status;

        UpdateInfo(roomName, status, playersCount, viewersCount);
    }

    public void UpdateInfo(string roomName, string status, int playersCount, int viewersCount)
    {
        this.currentStatus = status;

        // Actualizar textos
        if (roomNameText != null)
        {
            roomNameText.text = roomName;
        }

        if (statusText != null)
        {
            statusText.text = GetStatusDisplayText(status);
        }

        if (playersText != null)
        {
            playersText.text = $"Jugadores: {playersCount}/2";
        }

        if (viewersText != null)
        {
            viewersText.text = $"Espectadores: {viewersCount}";
        }

        // Actualizar color de fondo según estado
        if (backgroundImage != null)
        {
            backgroundImage.color = GetStatusColor(status);
        }

        // Habilitar/deshabilitar botón según estado
        if (joinButton != null)
        {
            // Solo permitir unirse como espectador si hay una partida activa
            joinButton.interactable = (status == "playing");
        }
    }

    string GetStatusDisplayText(string status)
    {
        switch (status.ToLower())
        {
            case "waiting":
                return "Esperando";
            case "playing":
                return "En Juego";
            case "finished":
                return "Finalizada";
            default:
                return status;
        }
    }

    Color GetStatusColor(string status)
    {
        switch (status.ToLower())
        {
            case "waiting":
                return waitingColor;
            case "playing":
                return playingColor;
            case "finished":
                return finishedColor;
            default:
                return Color.gray;
        }
    }

    void OnJoinButtonClicked()
    {
        if (gameClient != null && currentStatus == "playing")
        {
            Debug.Log($"Uniéndose a sala {roomId} como espectador");
            gameClient.JoinRoomAsViewer(roomId);
        }
        else
        {
            Debug.LogWarning("No se puede unir a esta sala en su estado actual");
        }
    }

    void OnDestroy()
    {
        if (joinButton != null)
        {
            joinButton.onClick.RemoveListener(OnJoinButtonClicked);
        }
    }
}