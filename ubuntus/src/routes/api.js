const { Router } = require("express");
const router = Router();
const dbHelpers = require("../dbHelpers");


router.post("/register", async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({
            status: 'error',
            message: 'Username and password are required'
        });
    }
    
    try {
        const bdd = req.app.get('bdd');
        const result = await dbHelpers.createUser(bdd, username, password);
        
        if (result.status === 'success') {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
});

router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({
            status: 'error',
            message: 'Username and password are required'
        });
    }
    
    try {
        const bdd = req.app.get('bdd');
        const result = await dbHelpers.loginUser(bdd, username, password);
        
        if (result.status === 'success') {
            res.json(result);
        } else {
            res.status(401).json(result);
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
});

// salas
router.get("/rooms", async (req, res) => {
    try {
        const bdd = req.app.get('bdd');
        const rooms = await dbHelpers.getAvailableRooms(bdd);
        res.json({
            status: 'success',
            rooms: rooms
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
});


//Replays
router.get("/replays", async (req, res) => {
    try {
        const bdd = req.app.get('bdd');
        const replays = await dbHelpers.getReplaysList(bdd);
        res.json({
            status: 'success',
            replays: replays
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
});

router.get("/replays/:id", async (req, res) => {
    try {
        const bdd = req.app.get('bdd');
        const replayId = parseInt(req.params.id);
        const replay = await dbHelpers.getReplayData(bdd, replayId);
        
        if (replay) {
            res.json({
                status: 'success',
                replay: replay
            });
        } else {
            res.status(404).json({
                status: 'error',
                message: 'Replay not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
});
module.exports = router;