const JewelType = {
    NONE: 0,
    RED: 1,
    GREEN: 2,
    BLUE: 3,
    YELLOW: 4,
    ORANGE: 5,
    PURPLE: 6,
    SHINY: 7
};

// Nombres de colores para logs
const JewelNames = {
    0: 'None',
    1: 'Red',
    2: 'Green',
    3: 'Blue',
    4: 'Yellow',
    5: 'Orange',
    6: 'Purple',
    7: 'Shiny'
};

// Dimensiones del grid
const GRID_CONFIG = {
    WIDTH: 6,      // 6 columnas
    HEIGHT: 13,    // 13 filas (clásico Columns)
    
    // Fila donde aparecen las piezas nuevas
    SPAWN_ROW: 12,
    
    // Fila donde si hay una joya = Game Over
    DEATH_ROW: 12
};

// Configuración de piezas
const PIECE_CONFIG = {
    // Cada pieza tiene 3 joyas apiladas verticalmente
    SIZE: 3,
    
    // Colores disponibles para generar piezas (sin NONE ni SHINY por ahora)
    AVAILABLE_COLORS: [
        JewelType.RED,
        JewelType.GREEN,
        JewelType.BLUE,
        JewelType.YELLOW,
        JewelType.ORANGE,
        JewelType.PURPLE
    ]
};

// Configuración de gameplay
const GAME_CONFIG = {
    // Velocidad inicial del juego
    INITIAL_TICK_RATE: 1000,  // 1 segundo
    
    // Velocidad mínima (más rápido no irá)
    MIN_TICK_RATE: 200,  // 0.2 segundos
    
    // Cada cuántos puntos acelerar el juego
    SPEED_UP_THRESHOLD: 100,
    
    // Cuánto reducir el tick cada vez que acelera (ms)
    SPEED_UP_AMOUNT: 50,
    
    // Tiempo que tarda en caer una pieza rápido (cuando presionas abajo)
    FAST_DROP_TICK: 100,  // 0.1 segundos
    
    // Mínimo de joyas conectadas para hacer match
    MIN_MATCH_SIZE: 3
};

// Puntuación
const SCORE_CONFIG = {
    // Puntos base por hacer un match
    BASE_POINTS: {
        3: 10,   // 3 joyas = 10 puntos
        4: 20,   // 4 joyas = 20 puntos
        5: 40,   // 5 joyas = 40 puntos
        6: 60,   // 6 joyas = 60 puntos
        7: 80,   // 7+ joyas = 80 puntos
    },
    
    // Multiplicador por combos consecutivos
    COMBO_MULTIPLIER: 1.5,
    
    // Puntos extra por limpiar múltiples grupos a la vez
    MULTI_MATCH_BONUS: 25
};

const GAME_COMMANDS = {
    MOVE_LEFT: 'moveLeft',
    MOVE_RIGHT: 'moveRight',
    MOVE_DOWN: 'moveDown',
    ROTATE: 'rotate',
    FAST_DROP: 'fastDrop'  // Bajar pieza hasta el fondo instantáneamente
};

const GAME_STATE = {
    WAITING: 'waiting',
    STARTING: 'starting',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver',
    FINISHED: 'finished'
};

const DIRECTION = {
    LEFT: -1,
    RIGHT: 1,
    DOWN: 1
};

module.exports = {
    JewelType,
    JewelNames,
    GRID_CONFIG,
    PIECE_CONFIG,
    GAME_CONFIG,
    SCORE_CONFIG,
    GAME_COMMANDS,
    GAME_STATE,
    DIRECTION
};