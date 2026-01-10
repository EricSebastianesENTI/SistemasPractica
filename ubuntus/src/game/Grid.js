const { JewelType, GRID_CONFIG } = require('./GameConstants');

class Grid {
    constructor(playerId, playerName) {
        this.playerId = playerId;
        this.playerName = playerName;
        
        this.cells = [];
        for (let x = 0; x < GRID_CONFIG.WIDTH; x++) {
            this.cells[x] = [];
            for (let y = 0; y < GRID_CONFIG.HEIGHT; y++) {
                this.cells[x][y] = JewelType.NONE;
            }
        }
        
        console.log(`Grid creado para ${playerName} (${GRID_CONFIG.WIDTH}x${GRID_CONFIG.HEIGHT})`);
    }

    getCell(x, y) {
        if (!this.isValidPosition(x, y)) return JewelType.NONE;
        return this.cells[x][y];
    }

    setCell(x, y, jewelType) {
        if (!this.isValidPosition(x, y)) return false;
        this.cells[x][y] = jewelType;
        return true;
    }

    isValidPosition(x, y) {
        return x >= 0 && x < GRID_CONFIG.WIDTH && 
               y >= 0 && y < GRID_CONFIG.HEIGHT;
    }

    isEmpty(x, y) {
        return this.getCell(x, y) === JewelType.NONE;
    }

    isColumnFull(x) {
        return !this.isEmpty(x, GRID_CONFIG.DEATH_ROW);
    }

    getLowestEmptyRow(x) {
        for (let y = 0; y < GRID_CONFIG.HEIGHT; y++) {
            if (this.isEmpty(x, y)) {
                return y;
            }
        }
        return -1;
    }

    // Aplicar gravedad: hacer caer joyas que tienen espacio debajo
    applyGravity() {
        let somethingFell = false;

        // Procesar de abajo hacia arriba para cada columna
        for (let x = 0; x < GRID_CONFIG.WIDTH; x++) {
            for (let y = 1; y < GRID_CONFIG.HEIGHT; y++) {
                // Si hay una joya y el espacio debajo está vacío
                if (!this.isEmpty(x, y) && this.isEmpty(x, y - 1)) {
                    // Mover la joya hacia abajo
                    this.cells[x][y - 1] = this.cells[x][y];
                    this.cells[x][y] = JewelType.NONE;
                    somethingFell = true;
                }
            }
        }

        return somethingFell;
    }

    // Aplicar gravedad hasta que nada caiga más
    applyGravityUntilStable() {
        let iterations = 0;
        while (this.applyGravity()) {
            iterations++;
            if (iterations > 20) {
                console.error('Gravedad no estabiliza - loop infinito detectado');
                break;
            }
        }
        return iterations;
    }

    // Colocar una pieza en una columna (las 3 joyas)
    // devuelve true si se coloca
    placePieceInColumn(column, jewels) {
        // jewels = [bottom, middle, top] (3 joyas)
        
        // Encontrar donde colocar
        let startY = this.getLowestEmptyRow(column);
        
        if (startY === -1 || startY + 2 >= GRID_CONFIG.HEIGHT) {
            return false; // No hay espacio
        }

        // Colocar las 3 joyas
        this.setCell(column, startY, jewels[0]);     // Abajo
        this.setCell(column, startY + 1, jewels[1]); // Medio
        this.setCell(column, startY + 2, jewels[2]); // Arriba

        return true;
    }

    // Remover joyas en las posiciones especificadas
    removeJewels(positions) {
        for (const pos of positions) {
            this.setCell(pos.x, pos.y, JewelType.NONE);
        }
    }

    // todas las celdas con joyas
    getAllNodes() {
        const nodes = [];
        
        for (let x = 0; x < GRID_CONFIG.WIDTH; x++) {
            for (let y = 0; y < GRID_CONFIG.HEIGHT; y++) {
                nodes.push({
                    type: this.cells[x][y],
                    x: x,
                    y: y
                });
            }
        }
        
        return nodes;
    }

    // Obtener solo las celdas que cambiaron
    getChangedNodes(previousGrid) {
        const changed = [];
        
        for (let x = 0; x < GRID_CONFIG.WIDTH; x++) {
            for (let y = 0; y < GRID_CONFIG.HEIGHT; y++) {
                const current = this.cells[x][y];
                const previous = previousGrid ? previousGrid.cells[x][y] : JewelType.NONE;
                
                if (current !== previous) {
                    changed.push({
                        type: current,
                        x: x,
                        y: y
                    });
                }
            }
        }
        
        return changed;
    }

    // Clonar el grid
    clone() {
        const cloned = new Grid(this.playerId, this.playerName);
        
        for (let x = 0; x < GRID_CONFIG.WIDTH; x++) {
            for (let y = 0; y < GRID_CONFIG.HEIGHT; y++) {
                cloned.cells[x][y] = this.cells[x][y];
            }
        }
        
        return cloned;
    }

    // Limpiar todo el grid
    clear() {
        for (let x = 0; x < GRID_CONFIG.WIDTH; x++) {
            for (let y = 0; y < GRID_CONFIG.HEIGHT; y++) {
                this.cells[x][y] = JewelType.NONE;
            }
        }
    }

    // Debug
    print() {
        console.log(`\n=== Grid de ${this.playerName} ===`);
        
        for (let y = GRID_CONFIG.HEIGHT - 1; y >= 0; y--) {
            let row = `${y.toString().padStart(2, '0')} |`;
            for (let x = 0; x < GRID_CONFIG.WIDTH; x++) {
                const jewel = this.cells[x][y];
                row += jewel === JewelType.NONE ? ' . ' : ` ${jewel} `;
            }
            console.log(row + '|');
        }
        
        console.log('   +' + '---'.repeat(GRID_CONFIG.WIDTH) + '+');
        console.log('    ' + Array.from({length: GRID_CONFIG.WIDTH}, (_, i) => ` ${i} `).join(''));
        console.log('');
    }
}

module.exports = Grid;