require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
const agentRoutes = require('./routes/agent');
const catalogRoutes = require('./routes/catalog');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const agentOrderRoutes = require('./routes/agent-order');
const auditRoutes = require('./routes/audit');
const approvalRoutes = require('./routes/approvals');

app.use('/api/agent', agentRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/agent-order', agentOrderRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/approvals', approvalRoutes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend is running' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
