/**
 * dbConnector.js
 * This module handles MySQL database connections using connection pooling
 * for improved performance and resource management.
 */

const mysql = require("mysql2/promise");
require("dotenv").config();
const config = require("./config");

// Create a connection pool to efficiently manage database connections
const pool = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  port: config.db.port,
  // Connection pool settings
  waitForConnections: true, // Wait for a connection to become available
  connectionLimit: 10, // Maximum number of connections in the pool
  queueLimit: 0, // Maximum number of connection requests to queue (0 = unlimited)
  maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
  enableKeepAlive: true, // Enable TCP Keep-Alive packets,
  // Set a longer connection timeout for slow VPC connections
  connectTimeout: 20000, // 20 seconds
});

/**
 * Function to execute queries with auto-reconnection capability
 * @param {string} sql - The SQL query to execute
 * @param {Array} params - The parameters for the SQL query
 * @returns {Promise<Object>} - The query results
 */
const executeQuery = async (sql, params = []) => {
  try {
    // Log connection attempt for debugging
    console.log(
      `Attempting DB connection to ${config.db.host}:${config.db.port} as ${config.db.user}`
    );

    // Using the connection pool to automatically handle connections
    const [results] = await pool.execute(sql, params);
    console.log(`Query executed successfully: ${sql.substring(0, 100)}...`);
    return results;
  } catch (error) {
    // Enhanced error logging with connection details
    console.error("Database query error:", error);
    console.error("Connection params:", {
      host: config.db.host,
      database: config.db.database,
      port: config.db.port,
      user: config.db.user,
      // Don't log the actual password, but log whether it's defined
      passwordDefined: !!config.db.password,
    });

    // Check for common connection issues
    if (error.code === "ENOTFOUND") {
      console.error(
        "Host not found. Check if the database endpoint is correct and if the Lambda has VPC access."
      );
    } else if (error.code === "ECONNREFUSED") {
      console.error(
        "Connection refused. Check if the database is running and if security groups allow access."
      );
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.error(
        "Access denied. Check your database username and password."
      );
    }

    throw error; // Re-throw to allow handling by the caller
  }
};

module.exports = {
  executeQuery,
  // Expose the pool for transaction support
  pool,
};
