/**
 * verify-connection.js
 * This script verifies the database connection after fixing permissions
 */

const { executeQuery } = require("./dbConnector");

async function verifyConnection() {
  console.log("🔍 Verifying database connection...");

  try {
    // Try to execute a simple query
    const result = await executeQuery("SELECT 1 as success");

    console.log("✅ Database connection successful!");
    console.log("Query result:", result);
    console.log("\nTry deploying your Lambda function again.");
    console.log("It should now be able to connect to the database.");

    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.error("More details:", error);

    return false;
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  verifyConnection();
}

module.exports = { verifyConnection };
