const { JewelType, PIECE_CONFIG, GRID_CONFIG, DIRECTION } = require('./GameConstants');

class Piece
{
    constructor() {
        this.jewels = this.generateRandomJewels();
        
        this.x = Math.floor(GRID_CONFIG.WIDTH / 2);
        this.y = GRID_CONFIG.SPAWN_ROW - 2;
        
    }

    generateRandomJewels()
    {
        const jewels = [];
        
        for (let i = 0; i < PIECE_CONFIG.SIZE; i++)
        {
            const randomIndex = Math.floor(Math.random() * PIECE_CONFIG.AVAILABLE_COLORS.length);
            jewels.push(PIECE_CONFIG.AVAILABLE_COLORS[randomIndex]);
        }
        
        return jewels;
    }

    rotate()
    {
        const top = this.jewels.pop();  
        this.jewels.unshift(top);     
        
        console.log(`Pieza rotada: [${this.jewels.join(', ')}]`);
    }

    move(direction)
    {
        this.x += direction;
        console.log(`↔Pieza movida a columna ${this.x}`);
    }

    moveDown()
    {
        this.y -= 1;
        console.log(`Pieza bajó a fila ${this.y}`);
    }

    canMove(grid, direction)
    {
        const newX = this.x + direction;
        
        if (newX < 0 || newX >= GRID_CONFIG.WIDTH)
        {
            return false;
        }

        for (let i = 0; i < PIECE_CONFIG.SIZE; i++)
        {
            const checkY = this.y + i;
            if (!grid.isEmpty(newX, checkY))
            {
                return false;
            }
        }

        return true;
    }

    canMoveDown(grid)
    {
        const checkY = this.y - 1;

        if (checkY < 0)
        {
            return false;
        }

        if (!grid.isEmpty(this.x, checkY))
        {
            return false;
        }

        return true;
    }

    placeInGrid(grid)
    {
        for (let i = 0; i < PIECE_CONFIG.SIZE; i++) {
            const placeY = this.y + i;
            grid.setCell(this.x, placeY, this.jewels[i]);
        }

    }

    getPositions()
    {
        const positions = [];
        
        for (let i = 0; i < PIECE_CONFIG.SIZE; i++)
        {
            positions.push({
                x: this.x,
                y: this.y + i,
                type: this.jewels[i]
            });
        }
        
        return positions;
    }

    getJewels()
    {
        return [...this.jewels];
    }

    isValidSpawn(grid)
    {
        for (let i = 0; i < PIECE_CONFIG.SIZE; i++)
        {
            const checkY = this.y + i;
            if (!grid.isEmpty(this.x, checkY))
            {
                return false;
            }
        }
        return true;
    }
}

module.exports = Piece;