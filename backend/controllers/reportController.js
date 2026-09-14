const { pool, rowToMenu } = require('../config/db');

const fmtMap = {
  daily: 'YYYY-MM-DD',
  monthly: 'YYYY-MM',
  yearly: 'YYYY',
};

// Admin: Sales report grouped by period (daily / monthly / yearly)
const adminSalesReport = async (req, res) => {
  try {
    const period = fmtMap[req.query.period] ? req.query.period : 'daily';
    const limit = Number(req.query.limit) || 12;
    const fmt = fmtMap[period];

    const result = await pool.query(
      `SELECT to_char("createdAt", $1) AS period,
              COUNT(*)::int AS orders,
              COALESCE(SUM(total_price), 0)::numeric AS revenue
       FROM orders
       WHERE status <> 'cancelled'
       GROUP BY period
       ORDER BY period DESC
       LIMIT $2`,
      [fmt, limit]
    );

    const results = result.rows.reverse().map((row) => ({
      period: row.period,
      orders: row.orders,
      revenue: Number(row.revenue),
    }));

    const summaryResult = await pool.query(
      `SELECT COUNT(*)::int AS total_orders,
              COALESCE(SUM(total_price), 0)::numeric AS total_revenue
       FROM orders
       WHERE status <> 'cancelled'`
    );
    const totalOrders = summaryResult.rows[0].total_orders;
    const totalRevenue = Number(summaryResult.rows[0].total_revenue);

    const todayResult = await pool.query(
      `SELECT COUNT(*)::int AS orders,
              COALESCE(SUM(total_price), 0)::numeric AS revenue
       FROM orders
       WHERE status <> 'cancelled'
         AND "createdAt" >= date_trunc('day', now())`
    );

    const categoryResult = await pool.query(
      `SELECT COALESCE(m.category, 'other') AS category,
              COUNT(*)::int AS order_items,
              SUM((item->>'quantity')::int) AS qty,
              COALESCE(SUM(((item->>'price')::numeric) * ((item->>'quantity')::int)), 0)::numeric AS revenue
       FROM orders o, jsonb_array_elements(o.items) AS item
       LEFT JOIN menus m ON m.id = (item->>'menuItem')::int
       WHERE o.status <> 'cancelled'
       GROUP BY m.category
       ORDER BY revenue DESC`
    );

    res.json({
      period,
      results,
      summary: {
        totalRevenue,
        totalOrders,
        avgOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
        periods: results.length,
      },
      today: {
        orders: todayResult.rows[0].orders,
        revenue: Number(todayResult.rows[0].revenue),
      },
      categoryBreakdown: categoryResult.rows.map((r) => ({
        category: r.category,
        orderItems: r.order_items,
        qty: r.qty,
        revenue: Number(r.revenue),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Shared: top selling menu items (joined with menus table)
const getTopSelling = async (pool_, limit, availableOnly) => {
  const base = `
    SELECT m.*,
           COALESCE(agg.sold_qty, 0)::int AS sold_qty,
           COALESCE(agg.revenue, 0)::numeric AS sold_revenue
    FROM menus m
    LEFT JOIN (
      SELECT (item->>'menuItem')::int AS menu_id,
             SUM((item->>'quantity')::int) AS sold_qty,
             SUM(((item->>'price')::numeric) * ((item->>'quantity')::int)) AS revenue
      FROM orders, jsonb_array_elements(items) AS item
      WHERE status <> 'cancelled'
      GROUP BY menu_id
    ) agg ON agg.menu_id = m.id
  `;
  const where = availableOnly ? ' WHERE m.available = TRUE' : '';
  const result = await pool_.query(
    `${base}${where} ORDER BY agg.sold_qty DESC NULLS LAST, m.name ASC LIMIT $1`,
    [limit]
  );
  return result.rows;
};

// Public: best sellers shown on the customer menu page
const getPopularMenu = async (req, res) => {
  try {
    const rows = await getTopSelling(pool, 8, true);
    res.json(rows.map((row) => ({ ...rowToMenu(row), soldQty: row.sold_qty, soldRevenue: Number(row.sold_revenue) })));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Public: featured / recommended items for the customer menu page
const getFeaturedMenu = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM menus WHERE available = TRUE AND featured = TRUE ORDER BY id ASC LIMIT 8`
    );
    res.json(result.rows.map(rowToMenu));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: top selling items report (all menus, includes unavailable)
const adminPopularItems = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const rows = await getTopSelling(pool, limit, false);
    res.json(
      rows.map((row) => ({
        ...rowToMenu(row),
        soldQty: row.sold_qty,
        soldRevenue: Number(row.sold_revenue),
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: menu items that have never been sold (from non-cancelled orders)
const adminUnsoldItems = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*
       FROM menus m
       WHERE m.id NOT IN (
         SELECT DISTINCT (item->>'menuItem')::int
         FROM orders, jsonb_array_elements(items) AS item
         WHERE status <> 'cancelled'
           AND (item->>'menuItem') ~ '^[0-9]+$'
       )
       ORDER BY m.category ASC, m.name ASC`
    );
    res.json(result.rows.map(rowToMenu));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  adminSalesReport,
  getPopularMenu,
  getFeaturedMenu,
  adminPopularItems,
  adminUnsoldItems,
};