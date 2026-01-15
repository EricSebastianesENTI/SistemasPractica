using UnityEngine;
using TMPro;
using System.Collections.Generic;

public class ScoreUI : MonoBehaviour
{
    [System.Serializable]
    public class PlayerScoreDisplay
    {
        public int playerId;
        public TextMeshProUGUI usernameText;
        public TextMeshProUGUI scoreText;
    }

    [Header("UI Elements")]
    [SerializeField] private PlayerScoreDisplay player1Display;
    [SerializeField] private PlayerScoreDisplay player2Display;
    [SerializeField] private TextMeshProUGUI gameStatusText;

    private Dictionary<int, PlayerScoreDisplay> playerDisplays = new Dictionary<int, PlayerScoreDisplay>();

    void Awake()
    {
        if (player1Display.usernameText != null)
        {
            playerDisplays[0] = player1Display; // Temporal hasta recibir IDs reales
        }

        if (player2Display.usernameText != null)
        {
            playerDisplays[1] = player2Display;
        }
    }

    public void UpdateScore(int playerId, string username, int score)
    {
        // Buscar display para este jugador
        PlayerScoreDisplay display = GetOrCreateDisplay(playerId);

        if (display != null)
        {
            if (display.usernameText != null)
            {
                display.usernameText.text = username;
            }

            if (display.scoreText != null)
            {
                display.scoreText.text = $"Score: {score}";
            }
        }
    }

    private PlayerScoreDisplay GetOrCreateDisplay(int playerId)
    {
        // Asignar displays dinámicamente
        if (!playerDisplays.ContainsKey(playerId))
        {
            if (playerDisplays.Count == 0 && player1Display.usernameText != null)
            {
                player1Display.playerId = playerId;
                playerDisplays[playerId] = player1Display;
            }
            else if (playerDisplays.Count == 1 && player2Display.usernameText != null)
            {
                player2Display.playerId = playerId;
                playerDisplays[playerId] = player2Display;
            }
        }

        playerDisplays.TryGetValue(playerId, out PlayerScoreDisplay display);
        return display;
    }

    public void UpdateGameStatus(string status)
    {
        if (gameStatusText != null)
        {
            gameStatusText.text = status;
        }
    }

    public void ShowGameOver(int winnerId, string winnerName, int winnerScore)
    {
        if (gameStatusText != null)
        {
            gameStatusText.text = $"¡{winnerName} GANA!\nPuntuación: {winnerScore}";
        }
    }

    public void Clear()
    {
        if (player1Display.scoreText != null)
        {
            player1Display.scoreText.text = "Score: 0";
        }

        if (player2Display.scoreText != null)
        {
            player2Display.scoreText.text = "Score: 0";
        }

        if (gameStatusText != null)
        {
            gameStatusText.text = "";
        }
    }
}