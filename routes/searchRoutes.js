const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const searchController = require("../controllers/searchController");

router.get("/", verifyToken, searchController.getAllBusinesses);
router.get("/all", verifyToken, searchController.getAllBusinesses);

module.exports = router;