const express           = require("express");
const router            = express.Router();
const verifyToken       = require("../middleware/authMiddleware");
const upload            = require("../middleware/uploadMiddleware");
const profileController = require("../controllers/profileController");

// Get logged-in user's own profile
router.get("/me",           verifyToken, profileController.getMyProfile);

// Update profile details (industry, location, description etc.)
router.put("/update",       verifyToken, profileController.updateProfile);

// Upload company logo
router.post("/upload-logo", verifyToken, upload.single("logo"), profileController.uploadLogo);

// View any approved business's public profile (used in search/connections)
router.get("/:userId",      verifyToken, profileController.getPublicProfile);

module.exports = router;