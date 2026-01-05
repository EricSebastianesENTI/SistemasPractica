const { Router } = require("express");
const router = Router();

router.get("/", (req, res) => {
    res.send("Columns Online Server - Running");
});

router.use("/characters", require("./characters"));
router.use("/weapons", require("./weapons"));
router.use("/chat", require("./chat"));


router.use("/api", require("./api"));

module.exports = router;