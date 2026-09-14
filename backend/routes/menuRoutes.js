const express = require('express');
const router = express.Router();
const {
  getAllMenu,
  getMenuItem,
  getAllMenuAdmin,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require('../controllers/menuController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validateImage } = upload;
const {
  getPopularMenu,
  getFeaturedMenu,
} = require('../controllers/reportController');

// Public routes
router.get('/', getAllMenu);
router.get('/popular', getPopularMenu);
router.get('/featured', getFeaturedMenu);
router.get('/:id', getMenuItem);

// Admin routes (protected)
router.get('/admin/all', authMiddleware, getAllMenuAdmin);
router.post('/admin', authMiddleware, upload.single('image'), validateImage, createMenuItem);
router.put('/admin/:id', authMiddleware, upload.single('image'), validateImage, updateMenuItem);
router.delete('/admin/:id', authMiddleware, deleteMenuItem);

module.exports = router;
