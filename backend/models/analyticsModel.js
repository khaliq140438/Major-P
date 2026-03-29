const db = require("../config/db");

// ================= ANALYTICS MONTHLY =================
// One row per user per month/year combination.
// Stores: revenue, gross_profit_margin (%), client_count.
// Gross profit ₹ is computed at query time — not stored.

// Upsert a single month entry.
// If the user re-submits the same month/year, it updates instead of inserting.
const upsertMonthlyEntry = (userId, data, callback) => {
  const { month, year, revenue, gross_profit_margin, client_count } = data;

  const query = `
    INSERT INTO analytics_monthly
      (user_id, month, year, revenue, gross_profit_margin, client_count)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      revenue             = VALUES(revenue),
      gross_profit_margin = VALUES(gross_profit_margin),
      client_count        = VALUES(client_count),
      updated_at          = CURRENT_TIMESTAMP
  `;

  db.query(query, [userId, month, year, revenue, gross_profit_margin, client_count], callback);
};

// Fetch last 10 months of data for the user, ordered oldest to newest.
// Also computes gross_profit (revenue × margin / 100) directly in SQL
// so the controller and frontend don't need to compute it themselves.
// MoM growth % is computed in the controller from this raw data.
const getMonthlyData = (userId, callback) => {
  const query = `
    SELECT * FROM (
      SELECT
        month,
        year,
        revenue,
        gross_profit_margin,
        client_count,
        ROUND((revenue * gross_profit_margin / 100), 2) AS gross_profit
      FROM analytics_monthly
      WHERE user_id = ?
      ORDER BY year DESC, month DESC
      LIMIT 11
    ) AS last11
    ORDER BY year ASC, month ASC
  `;

  db.query(query, [userId], callback);
};

// Check how many months of data a user has entered.
// Used by the credibility score computation to calculate analytics_score.
const getMonthlyEntryCount = (userId, callback) => {
  const query = `
    SELECT COUNT(*) AS entry_count
    FROM analytics_monthly
    WHERE user_id = ?
  `;

  db.query(query, [userId], callback);
};

// ================= CREDIBILITY SCORE =================
// Platform computes this — user has no form for it.
// Called automatically after any data change (monthly entry, profile update).
//
// Score breakdown (total = 100):
//   profile_score   (0-30): completeness of business_profiles + users fields
//   analytics_score (0-40): 4 points per month entered, max 10 months
//   network_score   (0-15): 3 points per accepted connection, max 5 connections
//   tenure_score    (0-15): 1 point per 15 days since account approved, max 15

const upsertCredibilityScore = (userId, scores, callback) => {
  const { profile_score, analytics_score, network_score, tenure_score, total_score } = scores;

  const query = `
    INSERT INTO analytics_credibility_score
      (user_id, profile_score, analytics_score, network_score, tenure_score, total_score)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      profile_score   = VALUES(profile_score),
      analytics_score = VALUES(analytics_score),
      network_score   = VALUES(network_score),
      tenure_score    = VALUES(tenure_score),
      total_score     = VALUES(total_score),
      computed_at     = CURRENT_TIMESTAMP
  `;

  db.query(query, [userId, profile_score, analytics_score, network_score, tenure_score, total_score], callback);
};

const getCredibilityScore = (userId, callback) => {
  const query = `SELECT * FROM analytics_credibility_score WHERE user_id = ?`;
  db.query(query, [userId], callback);
};

module.exports = {
  upsertMonthlyEntry,
  getMonthlyData,
  getMonthlyEntryCount,
  upsertCredibilityScore,
  getCredibilityScore
};