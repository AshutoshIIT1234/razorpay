const express = require('express');
const router = express.Router();
const { pool } = require('../db/db');

// Simulate an AI buyer completing a purchase
router.post('/', async (req, res) => {
  try {
    const { items, agent_id } = req.body;
    
    if (!items || !items.length) {
      return res.status(400).json({ success: false, error: 'No items provided' });
    }

    // In a real scenario, this would validate prices, calculate totals, and create an order
    // For demo purposes, we will simulate a successful machine-readable order completion
    // We could log this to the audit_logs as well
    const session_id = `agent_sim_${agent_id || Date.now()}`;
    
    await pool.query(
      'INSERT INTO audit_logs (session_id, action, input_data, outcome) VALUES ($1, $2, $3, $4)',
      [session_id, 'agent_machine_order', JSON.stringify({ items }), 'SUCCESS']
    );

    res.status(200).json({
      success: true,
      message: 'Order completed successfully by agent',
      order_id: `ao_${Date.now()}`
    });
  } catch (error) {
    console.error('Error processing agent order:', error);
    res.status(500).json({ success: false, error: 'Failed to process agent order' });
  }
});

module.exports = router;
