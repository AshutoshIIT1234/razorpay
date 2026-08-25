const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const fs = require('fs');
const { pool } = require('./db');

async function seed() {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    console.log('Running schema.sql...');
    await pool.query(schemaSql);
    console.log('Schema created successfully.');

    console.log('Inserting seed data...');
    const insertProductsSql = `
      INSERT INTO products (name, description, price, stock, attributes) VALUES
      ('Neural Engine Optimizer', 'Boost your local AI models with our dedicated hardware accelerator. Plug and play via Thunderbolt 4.', 24999.00, 15, '{"connector": "Thunderbolt 4", "type": "accelerator"}'),
      ('Quantum Core Processor', 'Next-generation quantum processing unit for complex simulations and cryptographic tasks.', 74999.00, 5, '{"architecture": "quantum", "cooling": "cryogenic"}'),
      ('Holographic Display Unit', 'Immersive 3D workspace display. No glasses required. Compatible with all major OS.', 39999.00, 10, '{"resolution": "8K", "3d": true}'),
      ('Cyberdeck Portable Terminal', 'Rugged, portable terminal for off-grid operations. Features satellite uplink and encrypted storage.', 99999.00, 3, '{"network": "satellite", "storage": "encrypted"}')
    `;
    await pool.query(insertProductsSql);

    console.log('Inserting demo user...');
    const insertUserSql = `
      INSERT INTO users (id, name, email) VALUES (1, 'Demo User', 'demo@nexus.store')
      ON CONFLICT (email) DO NOTHING;
    `;
    await pool.query(insertUserSql);

    console.log('Seed data inserted successfully.');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    pool.end();
  }
}

seed();
