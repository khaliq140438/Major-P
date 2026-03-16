const searchModel = require("../models/searchModel");

const getAllBusinesses = (req, res) => {
  const user_id = req.user.id;
  const searchQuery = req.query.q || '';

  searchModel.searchBusinesses(user_id, searchQuery, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json(results);
  });
};

module.exports = {
  getAllBusinesses,
};