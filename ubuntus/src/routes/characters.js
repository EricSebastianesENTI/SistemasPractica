const { Router } = require("express");
const router = Router();

const allCharacters = [
    { 
        "name": "Capitana Test",
        "class": "Hacker",
        "life": 10,
        "isLife": true
    },
    { 
        "name": "CasaTarradellas",
        "class": "Fuet",
        "life": 1000000,
        "isLife": true
    }
];

router.get("/", (req, res) => {
    const id = req.query.id;
    
    if (id === undefined) {
        res.json({ error: "Se requiere un id. Ejemplo: /characters?id=0" });
        return;
    }
    
    if (id < 0 || id >= allCharacters.length) {
        res.json({ error: "ID fuera de rango. Disponibles: 0-" + (allCharacters.length - 1) });
        return;
    }
    
    res.json(allCharacters[id]);
});

module.exports = router;