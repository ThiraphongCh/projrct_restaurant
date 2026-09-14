const jwt = require('jsonwebtoken');

// Simple admin login with hardcoded password (demo purposes)
const adminLogin = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Login successful',
      token,
      expiresIn: '24h',
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify admin token
const verifyToken = async (req, res) => {
  res.json({ message: 'Token is valid', admin: req.admin });
};

module.exports = { adminLogin, verifyToken };
