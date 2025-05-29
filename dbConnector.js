/**
 * dbConnector.js
 * This module handles MySQL database connections using connection pooling
 * for improved performance and resource management.
 * Now supports automatic password retrieval from AWS Secrets Manager.
 */

const mysql = require("mysql2/promise");
require("dotenv").config();
const { getDbConfig } = require("./secretsManager");

// Global connection pool variable
let pool = null;

/**
 * Initialize or recreate the connection pool with current credentials
 */
const initializePool = async () => {
  try {
    // Close existing pool if it exists
    if (pool) {
      await pool.end();
      console.log('Closed existing database connection pool');
    }

    // Get current database configuration (from Secrets Manager or env vars)
    const dbConfig = await getDbConfig();
    
    console.log('Initializing database connection pool with config:', {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      port: dbConfig.port,
      passwordDefined: !!dbConfig.password,
    });

    // Create a new connection pool
    pool = mysql.createPool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      port: dbConfig.port,
      // Connection pool settings
      waitForConnections: true, // Wait for a connection to become available
      connectionLimit: 10, // Maximum number of connections in the pool
      queueLimit: 0, // Maximum number of connection requests to queue (0 = unlimited)
      maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
      enableKeepAlive: true, // Enable TCP Keep-Alive packets,
      // Set a longer connection timeout for slow VPC connections
      connectTimeout: 20000, // 20 seconds
    });

    console.log('Database connection pool initialized successfully');
    return pool;
    
  } catch (error) {
    console.error('Error initializing database connection pool:', error);
    throw error;
  }
};

/**
 * Function to execute queries with auto-reconnection capability
 * @param {string} sql - The SQL query to execute
 * @param {Array} params - The parameters for the SQL query
 * @returns {Promise<Object>} - The query results
 */
const executeQuery = async (sql, params = []) => {
  try {
    // Initialize pool if it doesn't exist
    if (!pool) {
      await initializePool();
    }

    // Log connection attempt for debugging
    console.log(`Executing query: ${sql.substring(0, 100)}...`);

    // Using the connection pool to automatically handle connections
    const [results] = await pool.execute(sql, params);
    console.log(`Query executed successfully`);
    return results;
    
  } catch (error) {
    console.error("Database query error:", error);

    // Check for authentication errors that might indicate password rotation
    if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.log("Access denied error detected - attempting to refresh credentials and reconnect");
      try {
        // Clear the secrets cache and reinitialize the pool
        const { clearCache } = require("./secretsManager");
        clearCache();
        await initializePool();
        
        // Retry the query with new credentials
        console.log("Retrying query with refreshed credentials");
        const [results] = await pool.execute(sql, params);
        console.log("Query succeeded after credential refresh");
        return results;
      } catch (retryError) {
        console.error("Query failed even after credential refresh:", retryError);
        throw retryError;
      }
    }

    // Enhanced error logging for other connection issues
    if (error.code === "ENOTFOUND") {
      console.error(
        "Host not found. Check if the database endpoint is correct and if the Lambda has VPC access."
      );
    } else if (error.code === "ECONNREFUSED") {
      console.error(
        "Connection refused. Check if the database is running and if security groups allow access."
      );
    }

    throw error; // Re-throw to allow handling by the caller
  }
};

/**
 * Get the current connection pool (initialize if needed)
 * @returns {Promise<Object>} The connection pool
 */
const getPool = async () => {
  if (!pool) {
    await initializePool();
  }
  return pool;
};

/**
 * Gracefully close the connection pool
 */
const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connection pool closed');
  }
};

module.exports = {
  executeQuery,
  getPool,
  closePool,
  initializePool,
};
