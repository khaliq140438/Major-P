// controllers/reportController.js
const db = require("../config/db");

/* =====================================================
   ALL REPORTS SUMMARY
===================================================== */

exports.getAllReports = async (req, res) => {
  const userId = req.user.id;

  try {
    // Get monthly sales
    const monthlySales = await new Promise((resolve, reject) => {
      db.query(
        `SELECT month, total_sales FROM monthly_sales WHERE user_id = ? ORDER BY year ASC, month ASC`,
        [userId],
        (err, results) => err ? reject(err) : resolve(results)
      );
    });

    // Get customer demographics
    const customerDemographics = await new Promise((resolve, reject) => {
      db.query(
        `SELECT 
          COUNT(*) AS total_customers,
          SUM(CASE WHEN gender = 'Male' THEN 1 ELSE 0 END) AS male_count,
          SUM(CASE WHEN gender = 'Female' THEN 1 ELSE 0 END) AS female_count,
          SUM(CASE WHEN gender = 'Other' THEN 1 ELSE 0 END) AS other_count
        FROM customer_demographics WHERE company_id = ?`,
        [userId],
        (err, results) => err ? reject(err) : resolve(results[0])
      );
    });

    // Get website traffic
    const websiteTraffic = await new Promise((resolve, reject) => {
      db.query(
        `SELECT
          COUNT(*) AS total_visits,
          COUNT(DISTINCT visitor_id) AS unique_visitors,
          ROUND((SUM(CASE WHEN is_bounce = TRUE THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) AS bounce_rate
        FROM website_traffic WHERE company_id = ?`,
        [userId],
        (err, results) => err ? reject(err) : resolve(results[0])
      );
    });

    // Get inventory analysis
    const inventoryAnalysis = await new Promise((resolve, reject) => {
      db.query(
        `SELECT
          SUM(opening_stock) AS total_opening_stock,
          SUM(purchased_stock) AS total_purchased,
          SUM(sold_stock) AS total_sold,
          SUM((sold_stock * cost_per_unit)) AS total_cogs
        FROM inventory_records WHERE company_id = ?`,
        [userId],
        (err, results) => err ? reject(err) : resolve(results[0])
      );
    });

    res.json({
      monthlySales: monthlySales.map(r => ({
        month: r.month,
        total_sales: Number(r.total_sales)
      })),
      customerDemographics,
      websiteTraffic: {
        total_visits: Number(websiteTraffic.total_visits || 0),
        unique_visitors: Number(websiteTraffic.unique_visitors || 0),
        bounce_rate: Number(websiteTraffic.bounce_rate || 0)
      },
      inventoryAnalysis: {
        total_opening_stock: Number(inventoryAnalysis.total_opening_stock || 0),
        total_purchased_stock: Number(inventoryAnalysis.total_purchased || 0),
        total_sold_stock: Number(inventoryAnalysis.total_sold || 0),
        total_cogs: Number(inventoryAnalysis.total_cogs || 0)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* =====================================================
   MONTHLY SALES
===================================================== */

// Add Monthly Sales
exports.addMonthlySales = (req, res) => {
  const userId = req.user.id;
  const { month, year, total_sales, total_orders, total_expenses } = req.body;

  if (!month || !year || !total_sales || !total_orders || !total_expenses) {
    return res.status(400).json({ message: "All fields required" });
  }

  const query = `
    INSERT INTO monthly_sales
    (user_id, month, year, total_sales, total_orders, total_expenses)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [userId, month, year, total_sales, total_orders, total_expenses],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      res.status(201).json({ message: "Monthly sales data added successfully" });
    }
  );
};


// ✅ SIMPLIFIED ENDPOINT FOR CHART
exports.getMonthlySales = (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT month, total_sales
    FROM monthly_sales
    WHERE user_id = ?
    ORDER BY year ASC, month ASC
  `;

  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const formatted = results.map(r => ({
      month: r.month,
      total_sales: Number(r.total_sales)
    }));

    res.json(formatted);
  });
};


/* =====================================================
   CUSTOMER DEMOGRAPHICS
===================================================== */

exports.addCustomer = (req, res) => {
  const companyId = req.user.id;
  const { customer_name, age, gender, location } = req.body;

  if (!customer_name || !age || !gender || !location) {
    return res.status(400).json({ message: "All fields required" });
  }

  const query = `
    INSERT INTO customer_demographics
    (company_id, customer_name, age, gender, location)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(query, [companyId, customer_name, age, gender, location], (err) => {
    if (err) return res.status(500).json({ error: err.message });

    res.status(201).json({ message: "Customer added successfully" });
  });
};

exports.getCustomerDemographics = (req, res) => {
  const companyId = req.user.id;

  const query = `
    SELECT 
      COUNT(*) AS total_customers,
      SUM(CASE WHEN gender = 'Male' THEN 1 ELSE 0 END) AS male_count,
      SUM(CASE WHEN gender = 'Female' THEN 1 ELSE 0 END) AS female_count,
      SUM(CASE WHEN gender = 'Other' THEN 1 ELSE 0 END) AS other_count
    FROM customer_demographics
    WHERE company_id = ?
  `;

  db.query(query, [companyId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json(results[0]);
  });
};


/* =====================================================
   WEBSITE TRAFFIC
===================================================== */

exports.addWebsiteTraffic = (req, res) => {
  const companyId = req.user.id;
  const { visitor_id, source, device, is_bounce, visit_date } = req.body;

  if (!visitor_id || !source || !device || !visit_date) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  const query = `
    INSERT INTO website_traffic
    (company_id, visitor_id, source, device, is_bounce, visit_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [companyId, visitor_id, source, device, is_bounce || false, visit_date],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      res.status(201).json({ message: "Traffic data added successfully" });
    }
  );
};

exports.getWebsiteTrafficReport = (req, res) => {
  const companyId = req.user.id;

  const query = `
    SELECT
      COUNT(*) AS total_visits,
      COUNT(DISTINCT visitor_id) AS unique_visitors,
      ROUND(
        (SUM(CASE WHEN is_bounce = TRUE THEN 1 ELSE 0 END) / COUNT(*)) * 100,
        2
      ) AS bounce_rate
    FROM website_traffic
    WHERE company_id = ?
  `;

  db.query(query, [companyId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const data = results[0];

    res.json({
      total_visits: Number(data.total_visits),
      unique_visitors: Number(data.unique_visitors),
      bounce_rate: Number(data.bounce_rate) || 0
    });
  });
};


/* =====================================================
   INVENTORY
===================================================== */

exports.addInventoryRecord = (req, res) => {
  const companyId = req.user.id;

  const {
    product_name,
    opening_stock,
    purchased_stock,
    sold_stock,
    cost_per_unit,
    record_date
  } = req.body;

  if (
    !product_name ||
    opening_stock == null ||
    purchased_stock == null ||
    sold_stock == null ||
    !cost_per_unit ||
    !record_date
  ) {
    return res.status(400).json({ message: "All fields required" });
  }

  const query = `
    INSERT INTO inventory_records
    (company_id, product_name, opening_stock, purchased_stock, sold_stock, cost_per_unit, record_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [
      companyId,
      product_name,
      opening_stock,
      purchased_stock,
      sold_stock,
      cost_per_unit,
      record_date
    ],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      res.status(201).json({ message: "Inventory record added successfully" });
    }
  );
};

exports.getInventoryAnalysis = (req, res) => {
  const companyId = req.user.id;

  const query = `
    SELECT
      SUM(opening_stock) AS total_opening_stock,
      SUM(purchased_stock) AS total_purchased,
      SUM(sold_stock) AS total_sold,
      SUM((sold_stock * cost_per_unit)) AS total_cogs
    FROM inventory_records
    WHERE company_id = ?
  `;

  db.query(query, [companyId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const data = results[0];

    const totalOpening = Number(data.total_opening_stock) || 0;
    const totalPurchased = Number(data.total_purchased) || 0;
    const totalSold = Number(data.total_sold) || 0;
    const totalCOGS = Number(data.total_cogs) || 0;

    const closingStock = totalOpening + totalPurchased - totalSold;
    const averageInventory = (totalOpening + closingStock) / 2;

    const turnoverRatio =
      averageInventory > 0 ? totalCOGS / averageInventory : 0;

    res.json({
      total_opening_stock: totalOpening,
      total_purchased_stock: totalPurchased,
      total_sold_stock: totalSold,
      closing_stock: closingStock,
      inventory_turnover_ratio: Number(turnoverRatio.toFixed(2))
    });
  });
};


/* =====================================================
   PERFORMANCE SCORE
===================================================== */

exports.getPerformanceScore = async (req, res) => {
  const companyId = req.user.id;

  try {

    // ================= SALES =================
    const [salesData] = await new Promise((resolve, reject) => {
      db.query(
        `SELECT SUM(total_sales) AS total_sales,
                SUM(total_expenses) AS total_expenses
         FROM monthly_sales
         WHERE user_id = ?`,
        [companyId],
        (err, results) => err ? reject(err) : resolve(results)
      );
    });

    const totalSales = Number(salesData.total_sales) || 0;
    const totalExpenses = Number(salesData.total_expenses) || 0;
    const profit = totalSales - totalExpenses;

    const profitMargin =
      totalSales > 0 ? (profit / totalSales) * 100 : 0;

    const salesScore = Math.min(Math.round(profitMargin * 0.6), 100);


    // ================= INVENTORY =================
    const [inventoryData] = await new Promise((resolve, reject) => {
      db.query(
        `SELECT 
           SUM(sold_stock * cost_per_unit) AS total_cogs,
           SUM(opening_stock) AS total_opening
         FROM inventory_records
         WHERE company_id = ?`,
        [companyId],
        (err, results) => err ? reject(err) : resolve(results)
      );
    });

    const totalCOGS = Number(inventoryData.total_cogs) || 0;
    const totalOpening = Number(inventoryData.total_opening) || 1;

    const turnover = totalCOGS / totalOpening;

    let inventoryScore = 50;
    if (turnover > 5) inventoryScore = 80;
    if (turnover > 10) inventoryScore = 90;


    // ================= TRAFFIC =================
    const [trafficData] = await new Promise((resolve, reject) => {
      db.query(
        `SELECT
           COUNT(*) AS total_visits,
           SUM(CASE WHEN is_bounce = TRUE THEN 1 ELSE 0 END) AS bounce_count
         FROM website_traffic
         WHERE company_id = ?`,
        [companyId],
        (err, results) => err ? reject(err) : resolve(results)
      );
    });

    const totalVisits = Number(trafficData.total_visits) || 1;
    const bounceCount = Number(trafficData.bounce_count) || 0;

    const bounceRate = (bounceCount / totalVisits) * 100;
    const trafficScore = Math.round(Math.max(100 - bounceRate, 0));


    // ================= CUSTOMER =================
    const [customerData] = await new Promise((resolve, reject) => {
      db.query(
        `SELECT COUNT(*) AS total_customers
         FROM customer_demographics
         WHERE company_id = ?`,
        [companyId],
        (err, results) => err ? reject(err) : resolve(results)
      );
    });

    const totalCustomers = Number(customerData.total_customers) || 0;
    const customerScore = Math.min(totalCustomers * 5, 100);


    // ================= OVERALL =================
    const overallScore = Math.round(
      (salesScore + inventoryScore + trafficScore + customerScore) / 4
    );

    let performanceLevel = "Weak";
    if (overallScore > 80) performanceLevel = "Excellent";
    else if (overallScore > 60) performanceLevel = "Strong";
    else if (overallScore > 40) performanceLevel = "Moderate";

    res.json({
      sales_score: salesScore,
      inventory_score: inventoryScore,
      traffic_score: trafficScore,
      customer_score: customerScore,
      overall_score: overallScore,
      performance_level: performanceLevel
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};