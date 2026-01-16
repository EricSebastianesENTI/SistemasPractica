using System;
using TMPro;
using UnityEngine;

public class SocketIOChatTest : MonoBehaviour
{
    public TMP_InputField input;
    public string username = "UnityUser";

    public SocketIOUnity _socket;
    public string serverUrlLink = "http://192.168.1.56:3000/";

    void Start()
    {
        Uri uri = new Uri(serverUrlLink);
        _socket = new SocketIOUnity(uri);

        _socket.OnConnected += (sender, e) =>
        {
            Debug.Log("Socket Conectado correctamente");
            _socket.Emit("ClientRequestMessageListToServer");
        };

        _socket.OnDisconnected += (sender, e) =>
        {
            Debug.Log("Socket Desconectado");
        };

        _socket.On("ServerMessageToClient", (response) =>
        {
            Debug.Log("Mensaje recibido: " + response.ToString());
        });

        _socket.On("ServerResponseRequestMessageListToServer", (response) =>
        {
            Debug.Log("Lista de mensajes recibida: " + response.ToString());
        });

        _socket.Connect();
    }

    void OnDestroy()
    {
        if (_socket != null)
        {
            _socket.Disconnect();
        }
    }

    public void SendMessage()
    {
        if (string.IsNullOrEmpty(input.text))
        {
            Debug.LogWarning("El mensaje está vacío");
            return;
        }

        string text = input.text;

        var messageData = new
        {
            username = this.username,
            text = text
        };

        Debug.Log("Enviando mensaje: " + text);

        _socket.Emit("ClientMessageToServer", messageData);

        input.text = "";
    }
}