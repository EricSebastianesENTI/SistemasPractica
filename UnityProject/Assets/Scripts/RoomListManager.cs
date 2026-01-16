using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;

public class RoomListManager : MonoBehaviour
{
    [Header("References")]
    [SerializeField] private GameClient gameClient;
    [SerializeField] private Transform roomListContent;
    [SerializeField] private GameObject roomButtonPrefab;

    [Header("Settings")]
    [SerializeField] private float refreshInterval = 3f;

    private float lastRefreshTime;
    private Dictionary<int, GameObject> roomButtons = new Dictionary<int, GameObject>();

    void Start()
    {
        if (gameClient != null)
        {
            gameClient.GetRoomsList();
            lastRefreshTime = Time.time;
        }
        else
        {
            Debug.LogError(" GameClient no asignado en RoomListManager");
        }
    }

    void Update()
    {
        if (Time.time - lastRefreshTime >= refreshInterval)
        {
            RefreshRoomsList();
            lastRefreshTime = Time.time;
        }
    }

    public void RefreshRoomsList()
    {
        if (gameClient != null)
        {
            gameClient.GetRoomsList();
        }
    }

    public void OnRoomsListReceived(JArray roomsArray)
    {
        try
        {
            Debug.Log("===  DEBUG OnRoomsListReceived ===");

            if (roomsArray == null)
            {
                Debug.LogError(" roomsArray es NULL!");
                return;
            }

            Debug.Log($"Recibidas {roomsArray.Count} salas");
            Debug.Log($"JSON completo:\n{roomsArray.ToString(Newtonsoft.Json.Formatting.Indented)}");

            HashSet<int> currentRoomIds = new HashSet<int>();

            // Iterar sobre el JArray correctamente
            foreach (JToken roomToken in roomsArray)
            {
                try
                {
                    Debug.Log($"--- Procesando sala ---");
                    Debug.Log($"Token type: {roomToken.Type}");
                    Debug.Log($"Token content: {roomToken.ToString()}");

                    // Verificar que sea un objeto
                    if (roomToken.Type != JTokenType.Object)
                    {
                        Debug.LogError($" Token no es un objeto, es: {roomToken.Type}");
                        continue;
                    }

                    // Parsear con manejo seguro de nulos
                    JToken idToken = roomToken["id"];
                    JToken nameToken = roomToken["name"];
                    JToken statusToken = roomToken["status"];
                    JToken playersCountToken = roomToken["playersCount"];
                    JToken viewersCountToken = roomToken["viewersCount"];

                    // Verificar que todos los campos existen
                    if (idToken == null)
                    {
                        Debug.LogError(" Campo 'id' no encontrado");
                        continue;
                    }

                    // Convertir con seguridad
                    int roomId;
                    if (!int.TryParse(idToken.ToString(), out roomId))
                    {
                        Debug.LogError($" No se pudo parsear ID: {idToken}");
                        continue;
                    }

                    string roomName = nameToken?.ToString() ?? "Unknown";
                    string status = statusToken?.ToString() ?? "waiting";

                    int playersCount = 0;
                    if (playersCountToken != null)
                    {
                        int.TryParse(playersCountToken.ToString(), out playersCount);
                    }

                    int viewersCount = 0;
                    if (viewersCountToken != null)
                    {
                        int.TryParse(viewersCountToken.ToString(), out viewersCount);
                    }

                    Debug.Log($"   Sala parseada correctamente:");
                    Debug.Log($"   ID: {roomId}");
                    Debug.Log($"   Nombre: {roomName}");
                    Debug.Log($"   Estado: {status}");
                    Debug.Log($"   Jugadores: {playersCount}");
                    Debug.Log($"   Espectadores: {viewersCount}");

                    currentRoomIds.Add(roomId);

                    // Actualizar o crear botón
                    if (roomButtons.ContainsKey(roomId))
                    {
                        UpdateRoomButton(roomButtons[roomId], roomId, roomName, status, playersCount, viewersCount);
                    }
                    else
                    {
                        GameObject newButton = CreateRoomButton(roomId, roomName, status, playersCount, viewersCount);
                        if (newButton != null)
                        {
                            roomButtons[roomId] = newButton;
                        }
                    }
                }
                catch (System.Exception ex)
                {
                    Debug.LogError($" Error procesando sala individual: {ex.Message}");
                    Debug.LogError($"Stack trace: {ex.StackTrace}");
                }
            }

            // Eliminar salas que ya no existen
            List<int> toRemove = new List<int>();
            foreach (var kvp in roomButtons)
            {
                if (!currentRoomIds.Contains(kvp.Key))
                {
                    Debug.Log($" Eliminando sala {kvp.Key} (ya no existe)");
                    Destroy(kvp.Value);
                    toRemove.Add(kvp.Key);
                }
            }

            foreach (int id in toRemove)
            {
                roomButtons.Remove(id);
            }

            Debug.Log($" Lista de salas actualizada. Total visible: {roomButtons.Count}");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($" Error general en OnRoomsListReceived: {ex.Message}");
            Debug.LogError($"Stack trace: {ex.StackTrace}");
        }
    }

    GameObject CreateRoomButton(int roomId, string roomName, string status, int playersCount, int viewersCount)
    {
        try
        {
            if (roomButtonPrefab == null)
            {
                Debug.LogError(" roomButtonPrefab no está asignado en el Inspector!");
                return null;
            }

            if (roomListContent == null)
            {
                Debug.LogError(" roomListContent no está asignado en el Inspector!");
                return null;
            }

            GameObject buttonObj = Instantiate(roomButtonPrefab, roomListContent);

            RoomButton roomButton = buttonObj.GetComponent<RoomButton>();
            if (roomButton != null)
            {
                roomButton.Setup(roomId, roomName, status, playersCount, viewersCount, gameClient);
                Debug.Log($" Botón creado para sala: {roomName}");
            }
            else
            {
                Debug.LogError("RoomButton component no encontrado en el prefab!");
            }

            return buttonObj;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"Error creando botón: {ex.Message}");
            return null;
        }
    }

    void UpdateRoomButton(GameObject buttonObj, int roomId, string roomName, string status, int playersCount, int viewersCount)
    {
        try
        {
            RoomButton roomButton = buttonObj.GetComponent<RoomButton>();
            if (roomButton != null)
            {
                roomButton.UpdateInfo(roomName, status, playersCount, viewersCount);
            }
            else
            {
                Debug.LogError("RoomButton component no encontrado al actualizar!");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"Error actualizando botón: {ex.Message}");
        }
    }

    public void ClearRoomsList()
    {
        foreach (var button in roomButtons.Values)
        {
            if (button != null)
            {
                Destroy(button);
            }
        }
        roomButtons.Clear();
        Debug.Log("Lista de salas limpiada");
    }
}