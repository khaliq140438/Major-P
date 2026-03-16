const db             = require("../config/db");
const analyticsModel = require("../models/analyticsModel");

// ================= HELPER: COMPUTE CREDIBILITY SCORE =================
// Called internally after any data change.
// Computes all 4 components and saves to analytics_credibility_score.
//
// Score breakdown (total = 100):
//   profile_score    (0-25): how complete their business profile is
//   connection_score (0-25): number of accepted connections
//   activity_score   (0-25): whether they've filled analytics data
//   tenure_score     (0-25): how long their account has been approved

const computeAndSaveCredibilityScore = (userId, callback) => {
  const query = `
    SELECT
      -- Profile completeness data
      bp.company_description,
      bp.industry,
      bp.location,
      bp.website,
      bp.logo,
      bp.founded_year,
      bp.employee_count,

      -- Connection count
      (SELECT COUNT(*) FROM connections
       WHERE (sender_id = ? OR receiver_id = ?)
       AND status = 'accepted') AS connection_count,

      -- Analytics data filled
      (SELECT COUNT(*) FROM analytics_revenue    WHERE user_id = ?) AS has_revenue,
      (SELECT COUNT(*) FROM analytics_clients    WHERE user_id = ?) AS has_clients,
      (SELECT COUNT(*) FROM analytics_business_info WHERE user_id = ?) AS has_biz_info,

      -- Account age in days
      DATEDIFF(NOW(), u.created_at) AS account_age_days

    FROM users u
    LEFT JOIN business_profiles bp ON u.id = bp.user_id
    WHERE u.id = ?
  `;

  db.query(query, [userId, userId, userId, userId, userId, userId], (err, results) => {
    if (err) return callback(err);
    if (results.length === 0) return callback(new Error("User not found"));

    const data = results[0];

    // --- PROFILE SCORE (0-25) ---
    // 5 points for each filled field: description, industry, location, logo, website
    let profile_score = 0;
    if (data.company_description) profile_score += 5;
    if (data.industry)            profile_score += 5;
    if (data.location)            profile_score += 5;
    if (data.logo)                profile_score += 5;
    if (data.website)             profile_score += 5;

    // --- CONNECTION SCORE (0-25) ---
    // 5 points per connection, max 25
    const connection_score = Math.min(data.connection_count * 5, 25);

    // --- ACTIVITY SCORE (0-25) ---
    // 8 points for revenue data, 8 for client data, 9 for business info
    let activity_score = 0;
    if (data.has_revenue  > 0) activity_score += 8;
    if (data.has_clients  > 0) activity_score += 8;
    if (data.has_biz_info > 0) activity_score += 9;

    // --- TENURE SCORE (0-25) ---
    // 1 point per 15 days on platform, max 25 (earned over ~1 year)
    const tenure_score = Math.min(Math.floor(data.account_age_days / 15), 25);

    const total_score = profile_score + connection_score + activity_score + tenure_score;

    analyticsModel.upsertCredibilityScore(
      userId,
      { profile_score, connection_score, activity_score, tenure_score, total_score },
      callback
    );
  });
};

// ================= GET ALL MY ANALYTICS =================
// Returns all 4 analytics modules for the logged-in user.
// Used on their own Analytics page.
const getMyAnalytics = (req, res) => {
  const userId = req.user.id;

  // Recompute credibility score on every fetch — keeps it fresh
  computeAndSaveCredibilityScore(userId, (err) => {
    if (err) console.error("Score computation error:", err.message);

    // Fetch all 4 modules in parallel
    Promise.all([
      new Promise((resolve, reject) => analyticsModel.getRevenue(userId, (e, r) => e ? reject(e) : resolve(r))),
      new Promise((resolve, reject) => analyticsModel.getBusinessInfo(userId, (e, r) => e ? reject(e) : resolve(r[0] || {}))),
      new Promise((resolve, reject) => analyticsModel.getClients(userId, (e, r) => e ? reject(e) : resolve(r[0] || {}))),
      new Promise((resolve, reject) => analyticsModel.getCredibilityScore(userId, (e, r) => e ? reject(e) : resolve(r[0] || {})))
    ])
      .then(([revenue, businessInfo, clients, credibilityScore]) => {
        res.json({ revenue, businessInfo, clients, credibilityScore });
      })
      .catch((err) => {
        res.status(500).json({ message: "Failed to fetch analytics." });
      });
  });
};

// ================= MODULE 1: REVENUE =================
// POST — add or update a monthly revenue entry
const addRevenue = (req, res) => {
  const userId = req.user.id;
  const { month, year, revenue } = req.body;

  if (!month || !year || revenue === undefined) {
    return res.status(400).json({ message: "Month, year and revenue are required." });
  }

  if (month < 1 || month > 12) {
    return res.status(400).json({ message: "Month must be between 1 and 12." });
  }

  if (revenue < 0) {
    return res.status(400).json({ message: "Revenue cannot be negative." });
  }

  analyticsModel.addRevenue(userId, month, year, revenue, (err) => {
    if (err) return res.status(500).json({ message: "Failed to save revenue data." });

    // Recompute credibility score after data change
    computeAndSaveCredibilityScore(userId, () => {});

    res.status(201).json({ message: "Revenue data saved." });
  });
};

// GET — fetch revenue chart data
const getRevenue = (req, res) => {
  const userId = req.user.id;

  analyticsModel.getRevenue(userId, (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch revenue data." });
    res.json(results);
  });
};

// ================= MODULE 2: BUSINESS INFO =================
const saveBusinessInfo = (req, res) => {
  const userId = req.user.id;
  const { founded_year, employee_count, business_type, annual_turnover } = req.body;

  if (!founded_year && !employee_count && !business_type && !annual_turnover) {
    return res.status(400).json({ message: "At least one field is required." });
  }

  analyticsModel.upsertBusinessInfo(userId, { founded_year, employee_count, business_type, annual_turnover }, (err) => {
    if (err) return res.status(500).json({ message: "Failed to save business info." });

    computeAndSaveCredibilityScore(userId, () => {});
    res.status(201).json({ message: "Business info saved." });
  });
};

const getBusinessInfo = (req, res) => {
  const userId = req.user.id;

  analyticsModel.getBusinessInfo(userId, (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch business info." });
    res.json(results[0] || {});
  });
};

// ================= MODULE 3: CLIENTS =================
const saveClients = (req, res) => {
  const userId = req.user.id;
  const { total_clients, repeat_client_percent, industries_served, top_client_location } = req.body;

  if (total_clients === undefined) {
    return res.status(400).json({ message: "Total clients is required." });
  }

  if (repeat_client_percent < 0 || repeat_client_percent > 100) {
    return res.status(400).json({ message: "Repeat client percentage must be between 0 and 100." });
  }

  analyticsModel.upsertClients(userId, { total_clients, repeat_client_percent, industries_served, top_client_location }, (err) => {
    if (err) return res.status(500).json({ message: "Failed to save client data." });

    computeAndSaveCredibilityScore(userId, () => {});
    res.status(201).json({ message: "Client data saved." });
  });
};

const getClients = (req, res) => {
  const userId = req.user.id;

  analyticsModel.getClients(userId, (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch client data." });
    res.json(results[0] || {});
  });
};

// ================= MODULE 4: CREDIBILITY SCORE =================
// GET only — user cannot POST to this endpoint
// Score is always computed by the platform
const getCredibilityScore = (req, res) => {
  const userId = req.user.id;

  computeAndSaveCredibilityScore(userId, (err) => {
    if (err) return res.status(500).json({ message: "Failed to compute score." });

    analyticsModel.getCredibilityScore(userId, (err, results) => {
      if (err) return res.status(500).json({ message: "Failed to fetch score." });
      res.json(results[0] || { total_score: 0 });
    });
  });
};

module.exports = {
  getMyAnalytics,
  addRevenue,
  getRevenue,
  saveBusinessInfo,
  getBusinessInfo,
  saveClients,
  getClients,
  getCredibilityScore
};