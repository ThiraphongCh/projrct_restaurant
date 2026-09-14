const { pool } = require('../config/db');

// Restaurant floor: default number of tables. Stored in settings so admins can add/remove.
const DEFAULT_TABLES = 12;
const MAX_TABLES = 50;

const getTableCount = async () => {
  const result = await pool.query(`SELECT value FROM settings WHERE key = 'total_tables'`);
  const value = parseInt(result.rows[0]?.value, 10);
  if (Number.isNaN(value) || value < 1 || value > MAX_TABLES) return DEFAULT_TABLES;
  return value;
};

// Helper: row -> order object
const rowToOrder = (row) => ({
  _id: String(row.id),
  id: row.id,
  orderNumber: row.order_number,
  items: row.items,
  totalPrice: Number(row.total_price),
  customerName: row.customer_name,
  phone: row.phone,
  tableNumber: row.table_number,
  address: row.address,
  notes: row.notes,
  orderType: row.order_type,
  status: row.status,
  paymentMethod: row.payment_method,
  paidAmount: Number(row.paid_amount),
  changeAmount: Number(row.change_amount),
  paidAt: row.paid_at,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

// Create a new order (public - from customer checkout)
const createOrder = async (req, res) => {
  const { items, customerName, phone, tableNumber, address, notes, orderType } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Order must contain at least one item' });
  }
  if (items.length > 50) {
    return res.status(400).json({ message: 'Too many items in one order' });
  }
  const name = (customerName || '').trim() || 'Guest';

  const type = (orderType || 'dine_in') === 'delivery' ? 'delivery' : 'dine_in';
  let tableNum = '';
  if (type === 'dine_in' && !(tableNumber || '').trim()) {
    return res.status(400).json({ message: 'Table number is required for dine-in orders' });
  }
  if (type === 'dine_in') {
    tableNum = (tableNumber || '').trim();
    const totalTables = await getTableCount();
    if (!/^\d+$/.test(tableNum) || parseInt(tableNum, 10) < 1 || parseInt(tableNum, 10) > totalTables) {
      return res.status(400).json({ message: `Invalid table number. Valid range: 1-${totalTables}` });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (type === 'dine_in') {
      // Serialize order creation for the same table to prevent double-booking
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`table:${tableNum}`]);
      const busy = await client.query(
        `SELECT id FROM orders
         WHERE order_type = 'dine_in' AND table_number = $1 AND status NOT IN ('completed', 'cancelled')
         LIMIT 1`,
        [tableNum]
      );
      if (busy.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: `Table ${tableNum} is currently occupied` });
      }
    }

    // Validate each item, compute total from the DB price (never trust the client's price)
    let totalPrice = 0;
    const orderItems = [];
    for (const item of items) {
      const menuId = String(item?.menuItemId || '').trim();
      if (!/^\d+$/.test(menuId)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Invalid menu item id: ${menuId || '(empty)'}` });
      }
      const qty = item?.quantity;
      if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Invalid quantity for menu item ${menuId}. Quantity must be an integer between 1 and 99` });
      }
      const menuResult = await client.query('SELECT * FROM menus WHERE id = $1', [menuId]);
      if (menuResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Menu item not found: ${menuId}` });
      }
      const menuItem = menuResult.rows[0];
      if (!menuItem.available) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Item "${menuItem.name}" is no longer available` });
      }

      orderItems.push({
        menuItem: String(menuItem.id),
        name: menuItem.name,
        nameTh: menuItem.name_th,
        price: Number(menuItem.price),
        quantity: qty,
      });
      totalPrice += Number(menuItem.price) * qty;
    }

    // Generate order number from a concurrency-safe sequence
    const seqResult = await client.query("SELECT nextval('orders_order_num_seq') AS n");
    const orderNumber = `ORD-${String(seqResult.rows[0].n).padStart(4, '0')}`;

    const result = await client.query(
      `INSERT INTO orders (order_number, items, total_price, customer_name, phone, table_number, address, notes, status, order_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9) RETURNING *`,
      [
        orderNumber,
        JSON.stringify(orderItems),
        totalPrice,
        name,
        (phone || '').trim(),
        type === 'dine_in' ? tableNum : '',
        type === 'delivery' ? (address || '').trim() : '',
        (notes || '').trim(),
        type,
      ]
    );

    await client.query('COMMIT');
    res.status(201).json(rowToOrder(result.rows[0]));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('createOrder error:', error.message);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// Admin: Get all orders
const getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM orders';
    const params = [];
    if (status) {
      params.push(status);
      query += ' WHERE status = $1';
    }
    query += ' ORDER BY "createdAt" DESC';

    const result = await pool.query(query, params);
    res.json(result.rows.map(rowToOrder));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Get single order
const getOrder = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.orderId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(rowToOrder(result.rows[0]));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const result = await pool.query(
      `UPDATE orders SET status = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.orderId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(rowToOrder(result.rows[0]));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Get order stats
const getOrderStats = async (req, res) => {
  try {
    const totalResult = await pool.query('SELECT COUNT(*)::int AS total FROM orders');
    const pendingResult = await pool.query("SELECT COUNT(*)::int AS total FROM orders WHERE status = 'pending'");
    const preparingResult = await pool.query("SELECT COUNT(*)::int AS total FROM orders WHERE status = 'preparing'");
    const completedResult = await pool.query("SELECT COUNT(*)::int AS total FROM orders WHERE status = 'completed'");
    const cancelledResult = await pool.query("SELECT COUNT(*)::int AS total FROM orders WHERE status = 'cancelled'");
    const revenueResult = await pool.query(
      "SELECT COALESCE(SUM(total_price), 0)::numeric AS total FROM orders WHERE status <> 'cancelled'"
    );
    const completedRevenueResult = await pool.query(
      "SELECT COALESCE(SUM(total_price), 0)::numeric AS total FROM orders WHERE status = 'completed'"
    );
    const todayResult = await pool.query(
      `SELECT COUNT(*)::int AS orders,
              COALESCE(SUM(total_price), 0)::numeric AS revenue
       FROM orders
       WHERE status <> 'cancelled'
         AND "createdAt" >= date_trunc('day', now())`
    );
    const statusCountsResult = await pool.query(
      'SELECT status, COUNT(*)::int AS total FROM orders GROUP BY status'
    );
    const statusCounts = {};
    statusCountsResult.rows.forEach((r) => {
      statusCounts[r.status] = r.total;
    });

    const byTypeResult = await pool.query(
      `SELECT order_type,
              COUNT(*)::int AS orders,
              COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total_price END), 0)::numeric AS revenue
       FROM orders
       GROUP BY order_type`
    );
    const todayTypeResult = await pool.query(
      `SELECT order_type,
              COUNT(*)::int AS orders,
              COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total_price END), 0)::numeric AS revenue
       FROM orders
       WHERE "createdAt" >= date_trunc('day', now())
       GROUP BY order_type`
    );

    const byType = { dine_in: { orders: 0, revenue: 0 }, delivery: { orders: 0, revenue: 0 } };
    byTypeResult.rows.forEach((r) => {
      if (byType[r.order_type]) {
        byType[r.order_type].orders = r.orders;
        byType[r.order_type].revenue = Number(r.revenue);
      }
    });
    const todayByType = { dine_in: { orders: 0, revenue: 0 }, delivery: { orders: 0, revenue: 0 } };
    todayTypeResult.rows.forEach((r) => {
      if (todayByType[r.order_type]) {
        todayByType[r.order_type].orders = r.orders;
        todayByType[r.order_type].revenue = Number(r.revenue);
      }
    });

    res.json({
      totalOrders: totalResult.rows[0].total,
      pendingOrders: pendingResult.rows[0].total,
      preparingOrders: preparingResult.rows[0].total,
      completedOrders: completedResult.rows[0].total,
      cancelledOrders: cancelledResult.rows[0].total,
      totalRevenue: Number(revenueResult.rows[0].total),
      completedRevenue: Number(completedRevenueResult.rows[0].total),
      today: {
        orders: todayResult.rows[0].orders,
        revenue: Number(todayResult.rows[0].revenue),
      },
      statusCounts,
      byType,
      todayByType,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Public: Get restaurant table status (busy tables are dine-in orders not yet paid/completed)
const getTableStatus = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, table_number, order_number, customer_name, status, "createdAt"
       FROM orders
       WHERE order_type = 'dine_in' AND table_number <> '' AND status NOT IN ('completed', 'cancelled')
       ORDER BY "createdAt" ASC`
    );

    const occupied = {};
    result.rows.forEach((r) => {
      if (!occupied[r.table_number]) {
        occupied[r.table_number] = {
          orderId: String(r.id),
          orderNumber: r.order_number,
          customerName: r.customer_name,
          status: r.status,
          since: r.createdAt,
        };
      }
    });

    const totalTables = await getTableCount();

    const tables = Array.from({ length: totalTables }, (_, i) => {
      const num = String(i + 1);
      return { tableNumber: num, busy: Boolean(occupied[num]), ...(occupied[num] || {}) };
    });

    res.json({ totalTables, tables });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Add/remove restaurant tables
const updateTableCount = async (req, res) => {
  try {
    const total = parseInt(req.body.totalTables, 10);
    if (Number.isNaN(total) || total < 1 || total > MAX_TABLES) {
      return res.status(400).json({ message: `totalTables must be an integer between 1 and ${MAX_TABLES}` });
    }

    const current = await getTableCount();
    if (total < current) {
      // Reject removal while tables beyond the new count still have active dine-in orders
      const activeRange = [];
      for (let i = total + 1; i <= current; i++) activeRange.push(String(i));
      const busyResult = await pool.query(
        `SELECT DISTINCT table_number FROM orders
         WHERE order_type = 'dine_in'
           AND table_number = ANY($1)
           AND status NOT IN ('completed', 'cancelled')`,
        [activeRange]
      );
      if (busyResult.rows.length > 0) {
        const names = busyResult.rows.map((r) => r.table_number).join(', ');
        return res.status(409).json({
          message: `Cannot remove table(s) ${names}: the table(s) still have active orders`,
        });
      }
    }

    await pool.query(
      `INSERT INTO settings (key, value, "updatedAt")
       VALUES ('total_tables', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW()`,
      [String(total)]
    );

    res.json({ totalTables: total });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Confirm payment, mark order completed, store payment details
const payOrder = async (req, res) => {
  try {
    const { paymentMethod, paidAmount, changeAmount } = req.body;
    const validMethods = ['cash', 'transfer', 'card'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: `Invalid payment method. Must be one of: ${validMethods.join(', ')}` });
    }

    const result = await pool.query(
      `UPDATE orders
       SET status = 'completed',
           payment_method = $1,
           paid_amount = $2,
           change_amount = $3,
           paid_at = NOW(),
           "updatedAt" = NOW()
       WHERE id = $4 AND status <> 'cancelled' AND status <> 'completed'
       RETURNING *`,
      [paymentMethod, paidAmount || 0, changeAmount || 0, req.params.orderId]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Order not found or already paid/completed' });
    }
    res.json(rowToOrder(result.rows[0]));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrder,
  updateOrderStatus,
  getOrderStats,
  getTableStatus,
  updateTableCount,
  payOrder,
};