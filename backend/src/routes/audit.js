const express = require('express');
const router = express.Router();
const { pool } = require('../db/db');

// Get audit logs for a specific session
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await pool.query(
      'SELECT * FROM audit_logs WHERE session_id = $1 ORDER BY timestamp ASC',
      [sessionId]
    );
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

// Get all recent sessions (for listing in UI)
router.get('/sessions/recent', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT session_id, MAX(timestamp) as last_activity FROM audit_logs GROUP BY session_id ORDER BY last_activity DESC LIMIT 10'
    );
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching recent sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recent sessions' });
  }
});

module.exports = router;
