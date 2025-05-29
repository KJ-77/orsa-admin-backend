/**
 * test-secrets-manager.js
 * Test script for AWS Secrets Manager database credentials retrieval
 */

const { getDbConfig, clearCache } = require("./secretsManager");
const { executeQuery, initializePool, closePool } = require("./dbConnector");

// Set AWS profile for testing
process.env.AWS_PROFILE = "orsa";
process.env.AWS_REGION = "eu-west-3";

async function testSecretsManager() {
  try {
    console.log("🔐 Testing AWS Secrets Manager Integration\n");

    // Test 1: Get database config
    console.log("1️⃣ Testing database configuration retrieval...");
    const dbConfig = await getDbConfig();
    console.log("✅ Database config retrieved:", {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      port: dbConfig.port,
      passwordLength: dbConfig.password ? dbConfig.password.length : 0,
    });

    // Test 2: Test database connection with retrieved credentials
    console.log("\n2️⃣ Testing database connection...");
    const testQuery = "SELECT 1 as test_value, NOW() as current_time";
    const result = await executeQuery(testQuery);
    console.log("✅ Database connection successful:", result[0]);

    // Test 3: Test cache functionality
    console.log("\n3️⃣ Testing credentials caching...");
    const startTime = Date.now();
    await getDbConfig(); // Should use cache
    const cacheTime = Date.now() - startTime;
    console.log(`✅ Cached retrieval took ${cacheTime}ms`);

    // Test 4: Test cache clearing and refresh
    console.log("\n4️⃣ Testing cache refresh...");
    clearCache();
    const refreshStartTime = Date.now();
    await getDbConfig(); // Should fetch fresh
    const refreshTime = Date.now() - refreshStartTime;
    console.log(`✅ Fresh retrieval took ${refreshTime}ms`);

    // Test 5: Test connection pool recreation
    console.log("\n5️⃣ Testing connection pool recreation...");
    await initializePool();
    const poolTestResult = await executeQuery(
      "SELECT DATABASE() as current_db"
    );
    console.log("✅ Pool recreation successful:", poolTestResult[0]);

    console.log(
      "\n🎉 All tests passed! Secrets Manager integration is working correctly."
    );
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);

    if (error.message.includes("Secret not found")) {
      console.log("\n💡 Setup Instructions:");
      console.log(
        "1. Create a secret in AWS Secrets Manager with your database credentials"
      );
      console.log("2. The secret should contain JSON with these fields:");
      console.log("   {");
      console.log('     "username": "your-db-username",');
      console.log('     "password": "your-db-password",');
      console.log('     "host": "your-db-host",');
      console.log('     "dbname": "your-database-name",');
      console.log('     "port": 3306');
      console.log("   }");
      console.log(
        "3. Set the DB_SECRET_ID environment variable to your secret ARN or name"
      );
      console.log("4. Ensure your Lambda has permissions to access the secret");
    }

    if (error.message.includes("Access denied")) {
      console.log("\n💡 Permission Issue:");
      console.log(
        "- Ensure your Lambda execution role has secretsmanager:GetSecretValue permission"
      );
      console.log("- Check that the secret resource ARN matches your secret");
    }
  } finally {
    await closePool();
  }
}

// Helper function to show current environment
function showEnvironmentInfo() {
  console.log("🔧 Current Environment Configuration:");
  console.log("- AWS_REGION:", process.env.AWS_REGION || "not set");
  console.log(
    "- DB_SECRET_ID:",
    process.env.DB_SECRET_ID || "not set (will use env vars)"
  );
  console.log("- DB_HOST:", process.env.DB_HOST ? "set" : "not set");
  console.log("- DB_USER:", process.env.DB_USER ? "set" : "not set");
  console.log("- DB_PASSWORD:", process.env.DB_PASSWORD ? "set" : "not set");
  console.log();
}

// Run the test
if (require.main === module) {
  showEnvironmentInfo();
  testSecretsManager()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = {
  testSecretsManager,
  showEnvironmentInfo,
};
