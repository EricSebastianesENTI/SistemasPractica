const { Router } = require("express");
const router = Router();

router.get("/allWeapons", (req, res) => {
    const weapons = require("../statics/allWeapons.json");
    res.json(weapons);
});

router.get("/selectedWeapons", (req, res) => {
    const weapons = require("../statics/allWeapons.json");
    const id = req.query.id;
    
    if (id === undefined) {
        res.json({ error: "Se requiere un id. Ejemplo: /weapons/selectedWeapons?id=0" });
        return;
    }
    
    if (id < 0 || id >= weapons.length) {
        res.json({ error: "ID fuera de rango. Disponibles: 0-" + (weapons.length - 1) });
        return;
    }
    
    res.json(weapons[id]);
});

module.exports = router;