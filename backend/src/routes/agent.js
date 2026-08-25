const express = require('express');
const router = express.Router();
const { processChat } = require('../services/agentService');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/db');

// In-memory store for demo session state
const sessions = {};

router.post('/chat', async (req, res) => {
  try {
    const { messages, sessionId: clientSessionId, cart } = req.body;
    const sessionId = clientSessionId || uuidv4();
    
    if (!sessions[sessionId]) {
      sessions[sessionId] = { upsellAttempts: 0 };
    }

    // Store current cart in session state so agent knows what's in it
    sessions[sessionId].cart = cart || [];

    // Fetch user profile from DB (using hardcoded demo user ID 1 for now)
    const userRes = await pool.query('SELECT name, email, address FROM users WHERE id = 1');
    sessions[sessionId].profile = userRes.rows[0];

    // Process chat with agent
    let result = await processChat(messages, sessionId, sessions[sessionId]);
    
    // Loop to handle potential consecutive tool calls
    while (result.toolResults) {
      messages.push(result.message);
      messages.push(...result.toolResults);
      
      result = await processChat(messages, sessionId, sessions[sessionId]);
    }

    messages.push(result.message);
    res.status(200).json({ sessionId, messages });
  } catch (error) {
    console.error('Error in agent chat route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
