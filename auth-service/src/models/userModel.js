const mysql = require('mysql2/promise');

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'db',
  user: process.env.MYSQL_USER || 'authuser',
  password: process.env.MYSQL_PASSWORD || 'authpass',
  database: process.env.MYSQL_DB || 'authdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Create user
async function createUser({ name, email, password, userType }) {
  const [result] = await pool.execute(
    `INSERT INTO users (name, email, password, userType) VALUES (?, ?, ?, ?)`,
    [name, email, password, userType]
  );

  // Return the inserted user
  const [rows] = await pool.execute(
    `SELECT id, name, email, created_at, userType FROM users WHERE id = ?`,
    [result.insertId]
  );

  return rows[0];
}

// Find user by email
async function findUserByEmail(email) {
  const [rows] = await pool.execute(
    `SELECT id, name, email, password, created_at, userType FROM users WHERE email = ?`,
    [email]
  );

  return rows[0];
}

module.exports = { createUser, findUserByEmail};