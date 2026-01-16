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


const GRID_CONFIG = {
    WIDTH: 6,      // 6 columnas
    HEIGHT: 13,    // 13 filas
    

    SPAWN_ROW: 12,
    
    // Fila donde si hay una joya te mueres
    DEATH_ROW: 12
};

const PIECE_CONFIG = {
    SIZE: 3,
    
    AVAILABLE_COLORS: [
        JewelType.RED,
        JewelType.GREEN,
        JewelType.BLUE,
        JewelType.YELLOW,
        JewelType.ORANGE,
        JewelType.PURPLE
    ]
};


const GAME_CONFIG = {
    INITIAL_TICK_RATE: 1000,
    
    MIN_TICK_RATE: 200,
    
    SPEED_UP_THRESHOLD: 100,
    
    SPEED_UP_AMOUNT: 50,
    

    FAST_DROP_TICK: 100,
    
    MIN_MATCH_SIZE: 3
};


const SCORE_CONFIG = {
    BASE_POINTS: {
        3: 10,
        4: 20,
        5: 40,
        6: 60,
        7: 80,
    },
    
    COMBO_MULTIPLIER: 1.5,
    
    MULTI_MATCH_BONUS: 25
};

const GAME_COMMANDS = {
    MOVE_LEFT: 'moveLeft',
    MOVE_RIGHT: 'moveRight',
    MOVE_DOWN: 'moveDown',
    ROTATE: 'rotate',
    FAST_DROP: 'fastDrop'
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