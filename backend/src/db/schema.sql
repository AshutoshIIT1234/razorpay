-- Drop tables if they exist
DROP TABLE IF EXISTS approvals;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS products;

-- Products table
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  attributes JSONB DEFAULT '{}'::jsonb
);

-- Audit Logs table
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  input_data JSONB,
  reasoning TEXT,
  outcome VARCHAR(100),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Approvals table (for guardrail queue)
CREATE TABLE approvals (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (profile tracking)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table (order tracking)
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  razorpay_order_id VARCHAR(255) UNIQUE,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  items JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
