const { JewelType, GAME_CONFIG } = require('./GameConstants');

class MatchDetector
{
    static findMatches(grid)
    {
        const matches = [];
        const visited = new Set();

        for (let x = 0; x < grid.cells.length; x++)
        {
            for (let y = 0; y < grid.cells[x].length; y++)
            {
                const jewelType = grid.getCell(x, y);

                if (jewelType === JewelType.NONE) continue;
                const key = `${x},${y}`;
                if (visited.has(key)) continue;

                const group = this.findConnectedGroup(grid, x, y, jewelType, visited);

                if (group.length >= GAME_CONFIG.MIN_MATCH_SIZE)
                {
                    matches.push({
                        jewelType: jewelType,
                        positions: group,
                        size: group.length
                    });
                }
            }
        }

        return matches;
    }

    static findConnectedGroup(grid, startX, startY, jewelType, visited)
    {
        const group = [];
        const queue = [{x: startX, y: startY}];
        const localVisited = new Set();

        while (queue.length > 0)
        {
            const {x, y} = queue.shift();
            const key = `${x},${y}`;

            if (localVisited.has(key)) continue;
            localVisited.add(key);
            visited.add(key);

            if (grid.getCell(x, y) !== jewelType) continue;

            group.push({x, y});

            // Buscar casilla vecina
            const neighbors = [
                {x: x - 1, y: y},     
                {x: x + 1, y: y},    
                {x: x, y: y - 1},     
                {x: x, y: y + 1}     
            ];

            for (const neighbor of neighbors)
            {
                if (grid.isValidPosition(neighbor.x, neighbor.y))
                {
                    const neighborKey = `${neighbor.x},${neighbor.y}`;
                    if (!localVisited.has(neighborKey))
                    {
                        queue.push(neighbor);
                    }
                }
            }
        }

        return group;
    }

    static hasMatches(grid)
    {
        return this.findMatches(grid).length > 0;
    }

    static processMatches(grid)
    {
        const matches = this.findMatches(grid);

        if (matches.length === 0)
        {
            return {
                matchesFound: false,
                matchCount: 0,
                totalJewelsRemoved: 0,
                points: 0,
                removedPositions: []
            };
        }

        const allPositions = [];
        let totalJewels = 0;

        for (const match of matches)
        {
            allPositions.push(...match.positions);
            totalJewels += match.size;
        }

        grid.removeJewels(allPositions);

        const points = this.calculatePoints(matches);

        console.log(`Matches encontrados: ${matches.length} grupos, ${totalJewels} joyas removidas, ${points} puntos`);

        return {
            matchesFound: true,
            matchCount: matches.length,
            totalJewelsRemoved: totalJewels,
            points: points,
            removedPositions: allPositions,
            matches: matches
        };
    }

    static calculatePoints(matches)
    {
        let totalPoints = 0;

        for (const match of matches)
        {
            const size = match.size;
            
            let points = 0;
            if (size >= 7)
            {
                points = 80;
            } else if (size >= 6)
            {
                points = 60;
            } else if (size >= 5)
            {
                points = 40;
            } else if (size >= 4)
            {
                points = 20;
            } else if (size >= 3)
            {
                points = 10;
            }

            totalPoints += points;
        }

        if (matches.length > 1)
        {
            totalPoints += 25 * (matches.length - 1);
        }

        return totalPoints;
    }

    static printMatches(matches)
    {
        console.log(`\n=== Matches Encontrados: ${matches.length} ===`);
        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            console.log(`Match ${i + 1}: ${match.size} joyas tipo ${match.jewelType}`);
            console.log(`  Posiciones:`, match.positions.map(p => `(${p.x},${p.y})`).join(', '));
        }
        console.log('');
    }
}

module.exports = MatchDetector;