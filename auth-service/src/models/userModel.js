const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  // FIX: Match the service name in your docker-compose.yml
  host: process.env.MYSQL_HOST || 'auth-db', 
  user: process.env.MYSQL_USER || 'authuser',
  password: process.env.MYSQL_PASSWORD || 'authpass',
  database: process.env.MYSQL_DB || 'authdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function createUser({ name, email, password, userType }) {
  // Use .execute for prepared statements (security!)
  const [result] = await pool.execute(
    `INSERT INTO users (name, email, password, userType) VALUES (?, ?, ?, ?)`,
    [name, email, password, userType]
  );

  const [rows] = await pool.execute(
    `SELECT id, name, email, created_at, userType FROM users WHERE id = ?`,
    [result.insertId]
  );

  return rows[0];
}

async function findUserByEmailOrName(identifier) {
  const [rows] = await pool.execute(
    `SELECT id, name, email, password, created_at, userType
     FROM users
     WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?)
     LIMIT 1`,
    [identifier, identifier]
  );
  return rows[0];
}

module.exports = { createUser, findUserByEmailOrName };


