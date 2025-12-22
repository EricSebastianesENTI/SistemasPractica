using System;
using TMPro;
using UnityEngine;
public class SocketIOChatTest : MonoBehaviour
{
    //Documentation url:

    public TMP_InputField input;

    public SocketIOUnity _socket;
    public string serverUrlLink = "http://10.40.2.169:3000/";
    void Start()
    {
        Uri uri = new Uri(serverUrlLink);
        _socket = new SocketIOUnity(uri);

        _socket.OnConnected += (sender, e) =>
        {
            Debug.Log("Socket Enter");
        };

        _socket.Connect();
    }

    // Update is called once per frame
    void Update()
    {
        
    }

    public void SendMessage()
    {
        string text = input.text;

        _socket.Emit("UnityMessage", text);
    }
}