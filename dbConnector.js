/**
 * dbConnector.js
 * This module handles MySQL database connections using connection pooling
 * for improved performance and resource management.
 */

const mysql = require("mysql2/promise");
require("dotenv").config();

// Create a connection pool to efficiently manage database connections
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  // Connection pool settings
  waitForConnections: true, // Wait for a connection to become available
  connectionLimit: 10, // Maximum number of connections in the pool
  queueLimit: 0, // Maximum number of connection requests to queue (0 = unlimited)
  maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
  enableKeepAlive: true, // Enable TCP Keep-Alive packets
});

/**
 * Function to execute queries with auto-reconnection capability
 * @param {string} sql - The SQL query to execute
 * @param {Array} params - The parameters for the SQL query
 * @returns {Promise<Object>} - The query results
 */
const executeQuery = async (sql, params = []) => {
  try {
    // Using the connection pool to automatically handle connections
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error("Database query error:", error);
    throw error; // Re-throw to allow handling by the caller
  }
};

module.exports = {
  executeQuery,
  // Expose the pool for transaction support
  pool,
};
