const express        = require("express");
const router         = express.Router();
const verifyToken    = require("../middleware/authMiddleware");
const checkRole      = require("../middleware/roleMiddleware");
const adminController = require("../controllers/adminController");

// All admin routes are protected by both verifyToken and checkRole("admin")
// verifyToken — checks JWT is valid
// checkRole   — checks user.role === 'admin'

router.get("/stats",                  verifyToken, checkRole("admin"), adminController.getAdminStats);
router.get("/users/all",              verifyToken, checkRole("admin"), adminController.getAllUsers);
router.get("/users/recent",           verifyToken, checkRole("admin"), adminController.getRecentUsers);
router.get("/registrations/pending",  verifyToken, checkRole("admin"), adminController.getPendingRegistrations);
router.post("/registrations/approve", verifyToken, checkRole("admin"), adminController.approveRegistration);
router.post("/registrations/reject",  verifyToken, checkRole("admin"), adminController.rejectRegistration);

module.exports = router;