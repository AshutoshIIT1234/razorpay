const express = require('express');
const router = express.Router();
const { pool } = require('../db/db');

// Agent-facing Catalog API
router.get('/', async (req, res) => {
  try {
    // Return structured product data
    const result = await pool.query('SELECT * FROM products WHERE stock > 0');
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching catalog:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch catalog' });
  }
});

module.exports = router;
