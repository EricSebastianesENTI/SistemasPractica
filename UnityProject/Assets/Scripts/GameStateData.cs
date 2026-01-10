using System;
using System.Collections.Generic;

[Serializable]
public class GameStateData
{
    public int roomId;
    public string state;
    public bool isPaused;
    public Dictionary<string, int> scores;
    public Dictionary<string, List<NodeGrid.Node>> grids;
    public Dictionary<string, List<PiecePosition>> currentPieces;
}

[Serializable]
public class PiecePosition
{
    public int x;
    public int y;
    public int type;
}

[Serializable]
public class RoomData
{
    public int id;
    public string name;
    public string status;
    public int playersCount;
    public int viewersCount;
}