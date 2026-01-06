const { JewelType, PIECE_CONFIG, GRID_CONFIG, DIRECTION } = require('./GameConstants');

class Piece {
    constructor() {
        // Array de 3 joyas [bottom, middle, top]
        this.jewels = this.generateRandomJewels();
        
        // Posición actual de la pieza en el grid
        // x = columna donde está
        // y = fila donde está la joya de ABAJO
        this.x = Math.floor(GRID_CONFIG.WIDTH / 2);
        this.y = GRID_CONFIG.SPAWN_ROW - 2;
        
        console.log(`Nueva pieza: [${this.jewels.join(', ')}] en (${this.x}, ${this.y})`);
    }

    generateRandomJewels() {
        const jewels = [];
        
        for (let i = 0; i < PIECE_CONFIG.SIZE; i++) {
            const randomIndex = Math.floor(Math.random() * PIECE_CONFIG.AVAILABLE_COLORS.length);
            jewels.push(PIECE_CONFIG.AVAILABLE_COLORS[randomIndex]);
        }
        
        return jewels;
    }

    // Rotar la pieza
    // [1, 2, 3] -> [3, 1, 2]
    rotate() {
        const top = this.jewels.pop();  // Sacar la de arriba
        this.jewels.unshift(top);       // Ponerla abajo
        
        console.log(`Pieza rotada: [${this.jewels.join(', ')}]`);
    }

    // Mover la pieza horizontalmente
    move(direction) {
        this.x += direction;
        console.log(`↔Pieza movida a columna ${this.x}`);
    }

    // Mover la pieza hacia abajo
    moveDown() {
        this.y -= 1;
        console.log(`Pieza bajó a fila ${this.y}`);
    }

    // Verificar si la pieza puede moverse en una dirección
    canMove(grid, direction) {
        const newX = this.x + direction;
        
        // Verificar límites horizontales
        if (newX < 0 || newX >= GRID_CONFIG.WIDTH) {
            return false;
        }

        // Verificar que no haya joyas en esa columna a la altura de la pieza
        for (let i = 0; i < PIECE_CONFIG.SIZE; i++) {
            const checkY = this.y + i;
            if (!grid.isEmpty(newX, checkY)) {
                return false;
            }
        }

        return true;
    }

    // Verificar si la pieza puede bajar más
    canMoveDown(grid) {
        // La joya de abajo está en this.y
        // Verificar si puede bajar 1 posición
        const checkY = this.y - 1;

        // Si llegamos al fondo del grid
        if (checkY < 0) {
            return false;
        }

        // Verificar si hay algo debajo
        if (!grid.isEmpty(this.x, checkY)) {
            return false;
        }

        return true;
    }

    // Colocar la pieza en el grid (cuando ya no puede bajar más)
    placeInGrid(grid) {
        // Colocar las 3 joyas en la columna actual
        for (let i = 0; i < PIECE_CONFIG.SIZE; i++) {
            const placeY = this.y + i;
            grid.setCell(this.x, placeY, this.jewels[i]);
        }

        console.log(`Pieza colocada en columna ${this.x}, filas ${this.y}-${this.y + 2}`);
    }

    // Obtener las posiciones que ocupa la pieza actualmente
    getPositions() {
        const positions = [];
        
        for (let i = 0; i < PIECE_CONFIG.SIZE; i++) {
            positions.push({
                x: this.x,
                y: this.y + i,
                type: this.jewels[i]
            });
        }
        
        return positions;
    }

    // Obtener las joyas para enviar a Unity (para preview)
    getJewels() {
        return [...this.jewels];
    }

    // Verificar si la pieza está en una posición válida para aparecer
    isValidSpawn(grid) {
        // Verificar que las 3 posiciones estén vacías
        for (let i = 0; i < PIECE_CONFIG.SIZE; i++) {
            const checkY = this.y + i;
            if (!grid.isEmpty(this.x, checkY)) {
                return false;
            }
        }
        return true;
    }
}

module.exports = Piece;