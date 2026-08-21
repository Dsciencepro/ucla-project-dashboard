// db.js — FAST SQL Server connection pool v1.0
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER || '74.208.165.152',
  port: parseInt(process.env.DB_PORT || '7458'),
  user: process.env.DB_USER || 'tqf-reporting',
  password: process.env.DB_PASSWORD || '1h9vMK_U9!@TqfReporting@#2025#',
  database: process.env.DB_NAME || 'FAST',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 15000,
  requestTimeout: 30000,
};

let pool = null;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('Connected to FAST SQL Server');
  }
  return pool;
}

async function query(sqlText, params = {}) {
  const p = await getPool();
  const req = p.request();
  for (const [key, val] of Object.entries(params)) {
    req.input(key, val);
  }
  return req.query(sqlText);
}

module.exports = { getPool, query, sql };
