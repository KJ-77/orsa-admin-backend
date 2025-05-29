/**
 * Test script to debug RDS Secrets Manager access
 * This script helps identify issues with RDS-managed secrets
 */

// Set up environment variables
process.env.AWS_REGION = "eu-west-3";
process.env.AWS_PROFILE = "orsa"; // Use the orsa profile
process.env.DB_SECRET_ID = "rds!db-9a50aa73-8600-4fd7-ac67-596f2d27da20";

const {
  getDbConfig,
  listAvailableSecrets,
  getDbCredentials,
} = require("./secretsManager");
const { executeQuery, closePool } = require("./dbConnector");

async function testRDSSecretsAccess() {
  console.log("🔍 === Testing RDS Secrets Manager Access ===\n");

  try {
    // Step 1: List all available secrets to see what's there
    console.log("1. 📋 Listing all available secrets in region eu-west-3...");
    console.log("   This will help us see if the RDS secret is visible");
    const secrets = await listAvailableSecrets();

    if (secrets.length === 0) {
      console.log(
        "   ⚠️  No secrets found - this might be a permissions issue"
      );
    }
    console.log("\n");

    // Step 2: Try different variations of the secret name
    console.log("2. 🔑 Testing different secret name variations...");

    const secretVariations = [
      "rds!db-9a50aa73-8600-4fd7-ac67-596f2d27da20",
      "arn:aws:secretsmanager:eu-west-3:210532401644:secret:rds!db-9a50aa73-8600-4fd7-ac67-596f2d27da20",
      encodeURIComponent("rds!db-9a50aa73-8600-4fd7-ac67-596f2d27da20"),
    ];

    for (const secretName of secretVariations) {
      try {
        console.log(`   Trying: ${secretName}`);
        const credentials = await getDbCredentials(secretName);
        console.log(`   ✅ SUCCESS with: ${secretName}`);
        console.log("   Credentials structure:", Object.keys(credentials));
        break;
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
      }
    }
    console.log("\n");

    // Step 3: Test getDbConfig function
    console.log("3. ⚙️  Testing getDbConfig function...");
    try {
      const config = await getDbConfig();
      console.log("   ✅ Database configuration retrieved successfully:");
      console.log("   Config summary:", {
        host: config.host,
        user: config.user,
        database: config.database,
        port: config.port,
        passwordExists: !!config.password,
        passwordLength: config.password?.length || 0,
      });

      // Step 4: Test actual database connection
      console.log("\n4. 🔌 Testing database connection...");
      const result = await executeQuery(
        "SELECT 1 as test, NOW() as current_time"
      );
      console.log("   ✅ Database connection successful!");
      console.log("   Test result:", result);

      // Step 5: Test a real query
      console.log("\n5. 🗄️  Testing real database query...");
      const tables = await executeQuery("SHOW TABLES");
      console.log("   ✅ Database tables found:", tables.length);
      if (tables.length > 0) {
        console.log(
          "   First few tables:",
          tables.slice(0, 3).map((row) => Object.values(row)[0])
        );
      }

      console.log(
        "\n🎉 All tests passed! RDS Secrets Manager integration is working correctly."
      );
    } catch (configError) {
      console.error("   ❌ getDbConfig failed:", configError.message);

      // Fallback test with environment variables
      console.log("\n   🔄 Testing fallback to environment variables...");
      delete process.env.DB_SECRET_ID;
      try {
        const fallbackConfig = await getDbConfig();
        console.log("   ✅ Fallback to environment variables works");
        console.log("   Fallback config:", {
          host: fallbackConfig.host,
          user: fallbackConfig.user,
          database: fallbackConfig.database,
          port: fallbackConfig.port,
        });
      } catch (fallbackError) {
        console.error("   ❌ Fallback also failed:", fallbackError.message);
      }
    }
  } catch (error) {
    console.error("\n💥 Critical error during testing:", error);

    // Provide troubleshooting guidance
    console.log("\n🔧 Troubleshooting Guide:");

    if (error.message.includes("AccessDeniedException")) {
      console.log("   🔑 IAM Permissions Issue:");
      console.log(
        "   - Make sure your AWS credentials have Secrets Manager access"
      );
      console.log(
        "   - Deploy the updated serverless.yml to apply IAM permissions"
      );
      console.log("   - Check if the secret is in a different AWS account");
    } else if (error.message.includes("ResourceNotFoundException")) {
      console.log("   📍 Secret Not Found:");
      console.log(
        "   - Verify the secret name exactly matches what you provided"
      );
      console.log("   - Check you're in the correct AWS region (eu-west-3)");
      console.log("   - Ensure the RDS instance actually created the secret");
    } else if (error.message.includes("credentials")) {
      console.log("   🔐 AWS Credentials Issue:");
      console.log("   - Run: aws configure list");
      console.log(
        "   - Make sure AWS CLI is configured with valid credentials"
      );
      console.log("   - Check if you need to refresh your session token");
    }

    console.log("\n   📞 Next Steps:");
    console.log(
      '   1. Verify the secret exists: aws secretsmanager describe-secret --secret-id "rds!db-9a50aa73-8600-4fd7-ac67-596f2d27da20" --region eu-west-3'
    );
    console.log(
      '   2. Test credentials: aws secretsmanager get-secret-value --secret-id "rds!db-9a50aa73-8600-4fd7-ac67-596f2d27da20" --region eu-west-3'
    );
    console.log("   3. Deploy updated permissions: serverless deploy");
  } finally {
    // Clean up
    try {
      await closePool();
      console.log("\n🧹 Database connection pool closed");
    } catch (cleanupError) {
      console.log("Note: Error closing connection pool (this is usually okay)");
    }
  }
}

// Run the test
if (require.main === module) {
  testRDSSecretsAccess().catch(console.error);
}

module.exports = { testRDSSecretsAccess };
