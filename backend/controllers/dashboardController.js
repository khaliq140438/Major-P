const dashboardModel = require("../models/dashboardModel");

const getDashboard = (req, res) => {
  const user_id = req.user.id;

  dashboardModel.getDashboardData(user_id, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching dashboard" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const data = results[0];

  res.json({
    company_name:      data.company_name,
    account_status:    data.account_status,
    industry:          data.industry   || null,
    location:          data.location   || null,
    logo:              data.logo       || null,
    total_connections: Number(data.total_connections) || 0,
    pending_sent:      Number(data.pending_sent)      || 0,
    pending_received:  Number(data.pending_received)  || 0,
    unread_messages:   Number(data.unread_messages)   || 0
  });
  });
};

module.exports = {
  getDashboard
};