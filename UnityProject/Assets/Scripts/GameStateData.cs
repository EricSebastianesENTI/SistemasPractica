using System;
using System.Collections.Generic;


[Serializable]
public class GameInitData
{
    public int roomId;
    public GridConfig gridConfig;
    public List<PlayerInfo> players;
}

[Serializable]
public class GridConfig
{
    public int width;
    public int height;
}

[Serializable]
public class PlayerInfo
{
    public int userId;
    public string username;
}

[Serializable]
public class GameStateData
{
    public int roomId;
    public string state;
    public bool isPaused;
    public int tickRate;
    public long timestamp;
    public List<PlayerGameState> players;
}

[Serializable]
public class PlayerGameState
{
    public int playerId;
    public string username;
    public int score;
    public List<GridNode> grid;
    public List<PieceNode> currentPiece;
}

[Serializable]
public class GridNode
{
    public int type;  
    public int x;
    public int y;
}

[Serializable]
public class PieceNode
{
    public int type; 
    public int x;
    public int y;
}

[Serializable]
public class GameOverData
{
    public int winnerId;
    public int loserId;
    public Dictionary<string, int> scores;
}

[Serializable]
public class RoomData
{
    public int id;
    public string name;
    public string status;
    public int playersCount;
    public int viewersCount;
    public List<RoomPlayer> players;
}

[Serializable]
public class RoomPlayer
{
    public string username;
    public bool isReady;
}

public enum JewelType
{
    None = 0,
    Red = 1,
    Green = 2,
    Blue = 3,
    Yellow = 4,
    Orange = 5,
    Purple = 6,
    Shiny = 7
}

public enum GameState
{
    Waiting,
    Starting,
    Playing,
    Paused,
    GameOver,
    Finished
}