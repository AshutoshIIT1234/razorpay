const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../db/db');

router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      return res.status(500).json({ error: 'Razorpay secret not configured' });
    }

    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

      if (generated_signature === razorpay_signature) {
      // Payment is successful
      try {
        await pool.query('UPDATE orders SET status = $1 WHERE razorpay_order_id = $2', ['paid', razorpay_order_id]);
        await pool.query(
          'INSERT INTO audit_logs (session_id, action, input_data, outcome) VALUES ($1, $2, $3, $4)',
          [`order_${razorpay_order_id}`, 'capture_payment', JSON.stringify({ payment_id: razorpay_payment_id }), 'SUCCESS']
        );
      } catch(e) {
        console.error('Error updating DB on payment success', e);
      }
      
      return res.status(200).json({ status: 'success', message: 'Payment verified successfully' });
    } else {
      return res.status(400).json({ status: 'failure', error: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

module.exports = router;
