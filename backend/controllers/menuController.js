const { pool, rowToMenu } = require('../config/db');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Get all menu items (public)
const getAllMenu = async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM menus WHERE available = TRUE';
    const params = [];
    if (category) {
      params.push(category);
      query += ' AND category = $' + params.length;
    }
    query += ' ORDER BY category ASC, name ASC';

    const result = await pool.query(query, params);
    res.json(result.rows.map(rowToMenu));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single menu item
const getMenuItem = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM menus WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    res.json(rowToMenu(result.rows[0]));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Get all menu items (including unavailable)
const getAllMenuAdmin = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM menus ORDER BY category ASC, name ASC');
    res.json(result.rows.map(rowToMenu));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Resolve the image value: uploaded file (if any) wins, otherwise use the provided value
const imageFromRequest = (req, fallback) => {
  if (req.file) return `/uploads/${req.file.filename}`;
  return fallback;
};

// Admin: Create menu item
const createMenuItem = async (req, res) => {
  try {
    const { name, nameTh, description, descriptionTh, price, category, imageUrl, available, featured } = req.body;
    const resolvedImage = imageFromRequest(req, (imageUrl || '').trim());

    if (!name && !nameTh) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (price === undefined || price < 0) {
      return res.status(400).json({ message: 'Valid price is required' });
    }
    const validCategories = ['appetizer', 'main', 'dessert', 'drink', 'side'];
    if (!category || !validCategories.includes(category)) {
      return res.status(400).json({ message: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
    }

    const result = await pool.query(
      `INSERT INTO menus (name, name_th, description, description_th, price, category, image_url, available, featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        (name || nameTh || '').trim(),
        (nameTh || '').trim(),
        (description || '').trim(),
        (descriptionTh || '').trim(),
        Number(price),
        category,
        resolvedImage,
        available !== undefined ? available : true,
        featured !== undefined ? featured : false,
      ]
    );
    res.status(201).json(rowToMenu(result.rows[0]));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Update menu item
const updateMenuItem = async (req, res) => {
  try {
    const { name, nameTh, description, descriptionTh, price, category, imageUrl, available, featured } = req.body;
    const getResult = await pool.query('SELECT * FROM menus WHERE id = $1', [req.params.id]);
    if (getResult.rows.length === 0) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    const resolvedImage = req.file ? `/uploads/${req.file.filename}` : imageUrl;

    const result = await pool.query(
      `UPDATE menus SET
         name = COALESCE(NULLIF($1, ''), name),
         name_th = COALESCE(NULLIF($2, ''), name_th),
         description = COALESCE($3, description),
         description_th = COALESCE($4, description_th),
         price = COALESCE($5, price),
         category = COALESCE($6, category),
         image_url = COALESCE(NULLIF($7, ''), image_url),
         available = COALESCE($8, available),
         featured = COALESCE($9, featured),
         "updatedAt" = NOW()
       WHERE id = $10 RETURNING *`,
      [name, nameTh, description, descriptionTh, price, category, resolvedImage, available, featured, req.params.id]
    );

    // Remove the old local image after a successful replacement with a new file
    if (req.file) {
      const oldImage = getResult.rows[0].image_url;
      if (oldImage && oldImage.startsWith('/uploads/')) {
        const oldPath = path.join(UPLOADS_DIR, path.basename(oldImage));
        fs.unlink(oldPath, () => {});
      }
    }

    res.json(rowToMenu(result.rows[0]));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Delete menu item
const deleteMenuItem = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM menus WHERE id = $1 RETURNING id, image_url', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    // Remove locally uploaded image file (if any) to avoid orphans
    const imageUrl = result.rows[0].image_url;
    if (imageUrl && imageUrl.startsWith('/uploads/')) {
      const filePath = path.join(UPLOADS_DIR, path.basename(imageUrl));
      fs.unlink(filePath, () => {});
    }

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllMenu,
  getMenuItem,
  getAllMenuAdmin,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};