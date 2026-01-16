using System;
using System.Collections.Generic;
using UnityEngine;

public class NodeGrid : MonoBehaviour
{
    [Serializable]
    public class Node
    {
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

        public int x, y;
        public JewelType type;

        public Node(JewelType type, int x, int y)
        {
            this.type = type;
            this.x = x;
            this.y = y;
        }
    }

    [Serializable]
    public class Grid
    {
        [Serializable]
        public class Column
        {
            public List<Node> nodes = new();
        }

        public List<Column> columns = new();

        [SerializeField]
        private int _playerId;
        public int PlayerId => _playerId;

        [SerializeField]
        private string _playerName;
        public string PlayerName => _playerName;

        public Grid(GridSetup gridSetup)
        {
            _playerId = gridSetup.playerId;
            _playerName = gridSetup.playerName;

            for (int x = 0; x < gridSetup.sizeX; x++)
            {
                columns.Add(new());
                for (int y = 0; y < gridSetup.sizeY; y++)
                {
                    columns[x].nodes.Add(new Node(Node.JewelType.None, x, y));
                }
            }
        }

        public Node GetNode(int x, int y)
        {
            if (x < 0 || x >= columns.Count) return null;
            if (y < 0 || y >= columns[x].nodes.Count) return null;
            return columns[x].nodes[y];
        }
    }

    [Serializable]
    public class GridUpdate
    {
        public int playerId;
        public string playerName;
        public List<Node> updatedNodes;
    }

    [Serializable]
    public class GridSetup
    {
        public int playerId;
        public string playerName;
        public int sizeX;
        public int sizeY;
    }

    // CONFIGURACIÓN VISUAL
    [Header("Visual Settings")]
    [SerializeField] private GameObject jewelCellPrefab;
    [SerializeField] private float cellSize = 1f;
    [SerializeField] private Vector3 gridOffset = Vector3.zero;

    [Header("Jewel Colors")]
    [SerializeField] private Color noneColor = new Color(0.2f, 0.2f, 0.2f, 0.3f);
    [SerializeField] private Color redColor = Color.red;
    [SerializeField] private Color greenColor = Color.green;
    [SerializeField] private Color blueColor = Color.blue;
    [SerializeField] private Color yellowColor = Color.yellow;
    [SerializeField] private Color orangeColor = new Color(1f, 0.5f, 0f);
    [SerializeField] private Color purpleColor = new Color(0.5f, 0f, 1f);
    [SerializeField] private Color shinyColor = Color.white;

    // DATOS
    private Grid _grid;
    private Dictionary<Vector2Int, GameObject> _visualCells = new();

    public void SetupGrid(GridSetup gridSetup)
    {
        Debug.Log($"Setup Grid: {gridSetup.sizeX}x{gridSetup.sizeY} para {gridSetup.playerName}");

        _grid = new Grid(gridSetup);

        // Limpiar grid anterior si existe
        ClearVisualGrid();

        // Crear celdas visuales
        for (int x = 0; x < gridSetup.sizeX; x++)
        {
            for (int y = 0; y < gridSetup.sizeY; y++)
            {
                Vector3 position = new Vector3(
                    x * cellSize,
                    y * cellSize,
                    0
                ) + gridOffset;

                GameObject cell = Instantiate(jewelCellPrefab, position, Quaternion.identity, transform);
                cell.name = $"Cell_{x}_{y}";

                // Guardar referencia
                _visualCells[new Vector2Int(x, y)] = cell;

                // Inicialmente invisible o gris
                SetCellColor(cell, Node.JewelType.None);
            }
        }
    }

    public void UpdateGrid(GridUpdate gridUpdate)
    {
        if (_grid == null)
        {
            Debug.LogError("Grid no inicializado. Llama a SetupGrid primero.");
            return;
        }

        Debug.Log($"Actualizando {gridUpdate.updatedNodes.Count} nodos");

        foreach (var node in gridUpdate.updatedNodes)
        {
            // Actualizar datos
            var gridNode = _grid.GetNode(node.x, node.y);
            if (gridNode != null)
            {
                gridNode.type = node.type;
            }

            // Actualizar visual
            UpdateCellVisual(node.x, node.y, node.type);
        }
    }

    private void UpdateCellVisual(int x, int y, Node.JewelType type)
    {
        Vector2Int pos = new Vector2Int(x, y);

        if (_visualCells.TryGetValue(pos, out GameObject cell))
        {
            SetCellColor(cell, type);
        }
    }

    private void SetCellColor(GameObject cell, Node.JewelType type)
    {
        Renderer renderer = cell.GetComponent<Renderer>();
        if (renderer == null)
        {
            // Si es 2D, intentar con SpriteRenderer
            SpriteRenderer spriteRenderer = cell.GetComponent<SpriteRenderer>();
            if (spriteRenderer != null)
            {
                spriteRenderer.color = GetColorForJewelType(type);
            }
            return;
        }

        // Para 3D
        renderer.material.color = GetColorForJewelType(type);
    }

    private Color GetColorForJewelType(Node.JewelType type)
    {
        switch (type)
        {
            case Node.JewelType.None:
                return noneColor;
            case Node.JewelType.Red:
                return redColor;
            case Node.JewelType.Green:
                return greenColor;
            case Node.JewelType.Blue:
                return blueColor;
            case Node.JewelType.Yellow:
                return yellowColor;
            case Node.JewelType.Orange:
                return orangeColor;
            case Node.JewelType.Purple:
                return purpleColor;
            case Node.JewelType.Shiny:
                return shinyColor;
            default:
                return noneColor;
        }
    }

    private void ClearVisualGrid()
    {
        foreach (var cell in _visualCells.Values)
        {
            Destroy(cell);
        }
        _visualCells.Clear();
    }

    private void OnDestroy()
    {
        ClearVisualGrid();
    }

    // MÉTODO DE PRUEBA - Puedes eliminarlo después
    private void Start()
    {
        // Ejemplo de uso (descomenta para probar)
        /*
        SetupGrid(new GridSetup
        {
            playerId = 0,
            playerName = "Test Player",
            sizeX = 6,
            sizeY = 13
        });

        // Simular actualización
        GridUpdate update = new GridUpdate
        {
            playerId = 0,
            playerName = "Test Player",
            updatedNodes = new List<Node>
            {
                new Node(Node.JewelType.Red, 0, 0),
                new Node(Node.JewelType.Green, 1, 0),
                new Node(Node.JewelType.Blue, 2, 0),
                new Node(Node.JewelType.Yellow, 0, 1)
            }
        };

        UpdateGrid(update);
        */
    }
}