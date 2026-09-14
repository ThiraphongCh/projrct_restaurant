const express = require('express');
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getOrder,
  updateOrderStatus,
  getOrderStats,
  getTableStatus,
  updateTableCount,
  payOrder,
} = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/', createOrder);
router.get('/tables/status', getTableStatus);

// Admin routes (protected)
router.get('/admin', authMiddleware, getAllOrders);
router.get('/admin/stats', authMiddleware, getOrderStats);
router.put('/admin/tables', authMiddleware, updateTableCount);
router.get('/admin/:orderId', authMiddleware, getOrder);
router.post('/admin/:orderId/pay', authMiddleware, payOrder);
router.put('/admin/:orderId/status', authMiddleware, updateOrderStatus);

module.exports = router;
