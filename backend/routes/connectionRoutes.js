const express              = require("express");
const router               = express.Router();
const verifyToken          = require("../middleware/authMiddleware");
const connectionController = require("../controllers/connectionController");

router.post("/send",     verifyToken, connectionController.sendConnection);
router.post("/accept",   verifyToken, connectionController.acceptConnection);
router.post("/reject",   verifyToken, connectionController.rejectConnection);
router.get("/",          verifyToken, connectionController.viewConnections);
router.get("/pending",   verifyToken, connectionController.viewReceivedRequests);

module.exports = router;