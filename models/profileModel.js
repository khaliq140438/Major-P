const db = require("../config/db");

const createProfile = (profileData, callback) => {
  const { user_id, company_description, industry, location, website } = profileData;

  const query = `
    INSERT INTO business_profiles
    (user_id, company_description, industry, location, website)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(query, [user_id, company_description, industry, location, website], callback);
};

const getProfileByUserId = (user_id, callback) => {
  const query = `
    SELECT * FROM business_profiles
    WHERE user_id = ?
  `;

  db.query(query, [user_id], callback);
};

module.exports = {
  createProfile,
  getProfileByUserId,
};