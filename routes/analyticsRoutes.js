const express             = require("express");
const router              = express.Router();
const verifyToken         = require("../middleware/authMiddleware");
const analyticsController = require("../controllers/analyticsController");

// Get all analytics for the logged-in user (own analytics page)
router.get("/",                  verifyToken, analyticsController.getMyAnalytics);

// Module 1 — Revenue
router.post("/revenue",          verifyToken, analyticsController.addRevenue);
router.get("/revenue",           verifyToken, analyticsController.getRevenue);

// Module 2 — Business Info
router.post("/business-info",    verifyToken, analyticsController.saveBusinessInfo);
router.get("/business-info",     verifyToken, analyticsController.getBusinessInfo);

// Module 3 — Clients
router.post("/clients",          verifyToken, analyticsController.saveClients);
router.get("/clients",           verifyToken, analyticsController.getClients);

// Module 4 — Credibility Score (GET only — computed by platform)
router.get("/credibility-score", verifyToken, analyticsController.getCredibilityScore);

module.exports = router;