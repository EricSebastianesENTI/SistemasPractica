const { Router } = require("express");
const router = Router();
const path = require("path");

router.get("/", (req, res) => {
    // Redirigir al lobby
    res.redirect("/lobby");
});

router.get("/lobby", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/lobby.html"));
});

router.use("/characters", require("./characters"));
router.use("/weapons", require("./weapons"));
router.use("/chat", require("./chat"));

// API REST
router.use("/api", require("./api"));

module.exports = router;