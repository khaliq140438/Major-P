const db = require("../config/db");

const searchBusinesses = (user_id, searchQuery, callback) => {
  let query = `
    SELECT DISTINCT
      u.id,
      u.company_name,
      u.account_status,
      bp.industry,
      bp.location,
      bp.company_description,
      bp.website,
      bp.logo,

      -- 'approved' is the correct account_status value
      -- Previously this used verification_status = 'verified' which never existed
      CASE
        WHEN u.account_status = 'approved' THEN 1
        ELSE 0
      END AS is_verified,

      -- Shows the connection status between the logged-in user and this business
      (
        SELECT
          CASE
            WHEN c2.status = 'accepted'                        THEN 'connected'
            WHEN c2.status = 'pending' AND c2.sender_id = ?    THEN 'pending'
            WHEN c2.status = 'pending' AND c2.receiver_id = ?  THEN 'received_request'
            ELSE 'none'
          END
        FROM connections c2
        WHERE (
          (c2.sender_id = ? AND c2.receiver_id = u.id)
          OR
          (c2.sender_id = u.id AND c2.receiver_id = ?)
        )
        LIMIT 1
      ) AS connection_status

    FROM users u
    LEFT JOIN business_profiles bp ON u.id = bp.user_id

    WHERE u.id != ?
      AND u.role = 'business'
      AND u.account_status = 'approved'
  `;

  const params = [user_id, user_id, user_id, user_id, user_id];

  // Add search filter if query provided
  if (searchQuery && searchQuery.trim()) {
    query += `
      AND (
        u.company_name      LIKE ?
        OR bp.industry      LIKE ?
        OR bp.location      LIKE ?
        OR bp.company_description LIKE ?
      )
    `;
    const searchPattern = `%${searchQuery}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  // Hide connected users from standard discovery, but show them if actively searched
  if (!searchQuery || !searchQuery.trim()) {
    query += ` HAVING connection_status != 'connected' OR connection_status IS NULL`;
  }

  // Approved businesses first, then alphabetical
  query += ` ORDER BY u.company_name ASC`;

  db.query(query, params, callback);
};

module.exports = {
  searchBusinesses
};