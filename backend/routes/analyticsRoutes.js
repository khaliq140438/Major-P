const express             = require("express");
const router              = require("express").Router();
const verifyToken         = require("../middleware/authMiddleware");
const analyticsController = require("../controllers/analyticsController");

// GET  /api/analytics
// Returns last 10 months of data (with MoM growth) + credibility score.
// Main endpoint hit by the Analytics page on load.
router.get("/", verifyToken, analyticsController.getMyAnalytics);

// POST /api/analytics/monthly
// Save or update a single month's entry (revenue, margin, clients).
// User can re-submit the same month to edit it.
router.post("/monthly", verifyToken, analyticsController.saveMonthlyEntry);

// GET  /api/analytics/monthly
// Returns just the monthly chart data with MoM growth attached.
router.get("/monthly", verifyToken, analyticsController.getMonthlyData);

// GET  /api/analytics/credibility-score
// Recomputes and returns the latest credibility score.
// Called when only the score needs refreshing (e.g. after profile update).
router.get("/credibility-score", verifyToken, analyticsController.getCredibilityScore);

module.exports = router;