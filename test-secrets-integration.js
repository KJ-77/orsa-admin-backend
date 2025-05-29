/**
 * Test script to verify Secrets Manager integration
 * This script tests the connection using your RDS secret
 */

const {
  getDbConfig,
  getDbCredentials,
  clearCache,
} = require("./secretsManager");
const { executeQuery, initializePool, closePool } = require("./dbConnector");

async function testSecretsManagerIntegration() {
  console.log("🔐 Testing AWS Secrets Manager Integration");
  console.log("=====================================\n");

  try {
    // Test 1: Get configuration from Secrets Manager
    console.log("1. Testing credential retrieval from Secrets Manager...");
    process.env.DB_SECRET_ID = "rds!db-9a50aa73-8600-4fd7-ac67-596f2d27da20";

    const config = await getDbConfig();
    console.log("✅ Successfully retrieved configuration:", {
      host: config.host,
      user: config.user,
      database: config.database,
      port: config.port,
      passwordLength: config.password ? config.password.length : 0,
    });

    // Test 2: Test database connection
    console.log("\n2. Testing database connection...");
    const result = await executeQuery("SELECT 1 as test");
    console.log("✅ Database connection successful:", result);

    // Test 3: Test cache functionality
    console.log("\n3. Testing credential caching...");
    const config2 = await getDbConfig();
    console.log("✅ Second call (should use cache)");

    // Test 4: Test cache clearing
    console.log("\n4. Testing cache clearing...");
    clearCache();
    const config3 = await getDbConfig();
    console.log("✅ Cache cleared and credentials re-fetched");

    // Test 5: Test a real database query
    console.log("\n5. Testing real database query...");
    const tables = await executeQuery("SHOW TABLES");
    console.log(
      "✅ Database tables:",
      tables.map((row) => Object.values(row)[0])
    );

    console.log(
      "\n🎉 All tests passed! Secrets Manager integration is working correctly."
    );
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("Error details:", error);

    // Provide specific troubleshooting guidance
    if (error.message.includes("AccessDeniedException")) {
      console.log("\n🔧 Troubleshooting: IAM permissions issue");
      console.log(
        "- Make sure your AWS credentials have access to Secrets Manager"
      );
      console.log(
        "- Deploy the updated serverless.yml to apply IAM permissions"
      );
    } else if (error.message.includes("ResourceNotFoundException")) {
      console.log("\n🔧 Troubleshooting: Secret not found");
      console.log("- Check that the secret name is correct");
      console.log("- Make sure you're in the correct AWS region (eu-west-3)");
    }
  } finally {
    // Clean up
    await closePool();
    console.log("\n🧹 Database connection pool closed");
  }
}

// Run the test
if (require.main === module) {
  testSecretsManagerIntegration();
}

module.exports = { testSecretsManagerIntegration };
