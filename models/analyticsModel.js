const db = require("../config/db");

// ================= MODULE 1: REVENUE =================

const addRevenue = (userId, month, year, revenue, callback) => {
  const query = `
    INSERT INTO analytics_revenue (user_id, month, year, revenue)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE revenue = VALUES(revenue)
  `;
  db.query(query, [userId, month, year, revenue], callback);
};

const getRevenue = (userId, callback) => {
  const query = `
    SELECT month, year, revenue
    FROM analytics_revenue
    WHERE user_id = ?
    ORDER BY year ASC, month ASC
  `;
  db.query(query, [userId], callback);
};

// ================= MODULE 2: BUSINESS INFO =================

const upsertBusinessInfo = (userId, data, callback) => {
  const { founded_year, employee_count, business_type, annual_turnover } = data;
  const query = `
    INSERT INTO analytics_business_info 
      (user_id, founded_year, employee_count, business_type, annual_turnover)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      founded_year    = VALUES(founded_year),
      employee_count  = VALUES(employee_count),
      business_type   = VALUES(business_type),
      annual_turnover = VALUES(annual_turnover)
  `;
  db.query(query, [userId, founded_year, employee_count, business_type, annual_turnover], callback);
};

const getBusinessInfo = (userId, callback) => {
  const query = `SELECT * FROM analytics_business_info WHERE user_id = ?`;
  db.query(query, [userId], callback);
};

// ================= MODULE 3: CLIENTS =================

const upsertClients = (userId, data, callback) => {
  const { total_clients, repeat_client_percent, industries_served, top_client_location } = data;
  const query = `
    INSERT INTO analytics_clients
      (user_id, total_clients, repeat_client_percent, industries_served, top_client_location)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      total_clients          = VALUES(total_clients),
      repeat_client_percent  = VALUES(repeat_client_percent),
      industries_served      = VALUES(industries_served),
      top_client_location    = VALUES(top_client_location)
  `;
  db.query(query, [userId, total_clients, repeat_client_percent, industries_served, top_client_location], callback);
};

const getClients = (userId, callback) => {
  const query = `SELECT * FROM analytics_clients WHERE user_id = ?`;
  db.query(query, [userId], callback);
};

// ================= MODULE 4: CREDIBILITY SCORE =================
// This is computed by the platform — user cannot edit it.

const upsertCredibilityScore = (userId, scores, callback) => {
  const { profile_score, connection_score, activity_score, tenure_score, total_score } = scores;
  const query = `
    INSERT INTO analytics_credibility_score
      (user_id, profile_score, connection_score, activity_score, tenure_score, total_score)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      profile_score    = VALUES(profile_score),
      connection_score = VALUES(connection_score),
      activity_score   = VALUES(activity_score),
      tenure_score     = VALUES(tenure_score),
      total_score      = VALUES(total_score),
      computed_at      = CURRENT_TIMESTAMP
  `;
  db.query(query, [userId, profile_score, connection_score, activity_score, tenure_score, total_score], callback);
};

const getCredibilityScore = (userId, callback) => {
  const query = `SELECT * FROM analytics_credibility_score WHERE user_id = ?`;
  db.query(query, [userId], callback);
};

module.exports = {
  addRevenue,
  getRevenue,
  upsertBusinessInfo,
  getBusinessInfo,
  upsertClients,
  getClients,
  upsertCredibilityScore,
  getCredibilityScore
};