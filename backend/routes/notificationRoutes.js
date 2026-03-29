const express                = require("express");
const router                 = express.Router();
const verifyToken            = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

// GET  /api/notifications       — fetch all unread notifications for logged-in user
// POST /api/notifications/read  — mark one or all notifications as read

router.get("/",     verifyToken, notificationController.getUnreadNotifications);
router.post("/read", verifyToken, notificationController.markAsRead);

module.exports = router;