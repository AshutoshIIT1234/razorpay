const express = require('express');
const router = express.Router();
const { pool } = require('../db/db');

// Get all pending approvals
router.get('/pending', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM approvals WHERE status = 'pending' ORDER BY created_at DESC"
    );
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending approvals' });
  }
});

// Approve or reject an action
router.post('/:id/:action', async (req, res) => {
  try {
    const { id, action } = req.params;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }
    
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const result = await pool.query(
      "UPDATE approvals SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
      [newStatus, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Approval not found' });
    }
    
    // In a real app, this would also trigger the queued action or notify the agent
    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error(`Error processing approval action:`, error);
    res.status(500).json({ success: false, error: 'Failed to process approval action' });
  }
});

module.exports = router;
