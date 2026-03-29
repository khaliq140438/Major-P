// routes/reportRoutes.js

const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/authMiddleware");

const {
  getAllReports,
  addMonthlySales,
  getMonthlySales,
  addCustomer,
  getCustomerDemographics,
  addWebsiteTraffic,
  getWebsiteTrafficReport,
  addInventoryRecord,
  getInventoryAnalysis,
  getPerformanceScore
} = require("../controllers/reportController");


// ================= ALL REPORTS =================
router.get("/", authenticateToken, getAllReports);


// ================= PERFORMANCE =================
router.get("/performance-score", authenticateToken, getPerformanceScore);


// ================= INVENTORY =================
router.post("/inventory", authenticateToken, addInventoryRecord);
router.get("/inventory-analysis", authenticateToken, getInventoryAnalysis);
router.get("/inventory/analysis", authenticateToken, getInventoryAnalysis);


// ================= WEBSITE TRAFFIC =================
router.post("/website-traffic", authenticateToken, addWebsiteTraffic);
router.get("/website-traffic", authenticateToken, getWebsiteTrafficReport);


// ================= CUSTOMERS =================
router.post("/customers", authenticateToken, addCustomer);
router.get("/customers/demographics", authenticateToken, getCustomerDemographics);


// ================= MONTHLY SALES =================
router.post("/monthly-sales", authenticateToken, addMonthlySales);
router.get("/monthly-sales", authenticateToken, getMonthlySales);
// router.get("/monthly-sales/summary", authenticateToken, getMonthlySalesSummary);


module.exports = router;