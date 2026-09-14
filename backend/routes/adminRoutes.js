const express = require('express');
const router = express.Router();
const { adminLogin, verifyToken } = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const {
  adminSalesReport,
  adminPopularItems,
  adminUnsoldItems,
} = require('../controllers/reportController');

// Public route - login
router.post('/login', adminLogin);

// Protected route - verify token
router.get('/verify', authMiddleware, verifyToken);

// Protected routes - reports
router.get('/reports/sales', authMiddleware, adminSalesReport);
router.get('/reports/popular', authMiddleware, adminPopularItems);
router.get('/reports/unsold', authMiddleware, adminUnsoldItems);

module.exports = router;
