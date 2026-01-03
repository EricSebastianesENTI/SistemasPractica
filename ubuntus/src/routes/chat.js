const { Router } = require("express");
const router = Router();

router.get("/", (req, res) => {
    var path = require('path');
    res.sendFile(path.resolve(__dirname + "/../public/chat.html"));
});

module.exports = router;