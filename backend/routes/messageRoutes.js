const express = require("express");
const router = express.Router();
// const { sendMessage } = require("../controllers/messageController");
// const { sendMessage, getConversations } = require("../controllers/messageController");
const { sendMessage, getConversations, getMessages } = require("../controllers/messageController");
const authenticateToken = require("../middleware/authMiddleware");

router.post("/send", authenticateToken, sendMessage);
router.get("/conversations", authenticateToken, getConversations);
router.get("/:conversationId", authenticateToken, getMessages);

module.exports = router;