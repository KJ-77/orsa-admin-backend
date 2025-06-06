/**
 * AWS Cognito Setup Script
 * This script helps you create a Cognito User Pool and App Client for your application
 * Run this script with: node setup-cognito.js
 */

const {
  CognitoIdentityProviderClient,
  CreateUserPoolCommand,
  CreateUserPoolClientCommand,
  CreateGroupCommand,
  DescribeUserPoolCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

// Configure AWS region
const REGION = "eu-west-3"; // Should match your serverless.yml region
const client = new CognitoIdentityProviderClient({ region: REGION });

async function createCognitoSetup() {
  try {
    console.log("🚀 Starting AWS Cognito setup...\n");

    // 1. Create User Pool
    console.log("1. Creating Cognito User Pool...");
    const userPoolParams = {
      PoolName: "orsa-admin-user-pool",
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
          RequireUppercase: true,
          RequireLowercase: true,
          RequireNumbers: true,
          RequireSymbols: false,
          TemporaryPasswordValidityDays: 7,
        },
      },
      AutoVerifiedAttributes: ["email"],
      UsernameAttributes: ["email"],
      UsernameConfiguration: {
        CaseSensitive: false,
      },
      Schema: [
        {
          Name: "email",
          AttributeDataType: "String",
          Required: true,
          Mutable: true,
        },
        {
          Name: "given_name",
          AttributeDataType: "String",
          Required: false,
          Mutable: true,
        },
        {
          Name: "family_name",
          AttributeDataType: "String",
          Required: false,
          Mutable: true,
        },
      ],
      EmailConfiguration: {
        EmailSendingAccount: "COGNITO_DEFAULT",
      },
      UserPoolTags: {
        Environment: "development",
        Project: "orsa-admin",
      },
    };

    const userPoolResult = await client.send(
      new CreateUserPoolCommand(userPoolParams)
    );
    const userPoolId = userPoolResult.UserPool.Id;

    console.log(`✅ User Pool created: ${userPoolId}`);

    // 2. Create App Client
    console.log("\n2. Creating App Client...");
    const appClientParams = {
      UserPoolId: userPoolId,
      ClientName: "orsa-admin-app-client",
      GenerateSecret: false, // Don't generate secret for frontend apps
      ExplicitAuthFlows: [
        "ALLOW_USER_SRP_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH",
        "ALLOW_USER_PASSWORD_AUTH", // For development/testing
      ],
      SupportedIdentityProviders: ["COGNITO"],
      CallbackURLs: ["http://localhost:3000", "https://orsa-admin.vercel.app"],
      LogoutURLs: ["http://localhost:3000", "https://orsa-admin.vercel.app"],
      AllowedOAuthFlows: ["code"],
      AllowedOAuthScopes: ["email", "openid", "profile"],
      AllowedOAuthFlowsUserPoolClient: false, // Disable OAuth for simplicity
      TokenValidityUnits: {
        AccessToken: "hours",
        IdToken: "hours",
        RefreshToken: "days",
      },
      AccessTokenValidity: 1, // 1 hour
      IdTokenValidity: 1, // 1 hour
      RefreshTokenValidity: 30, // 30 days
      PreventUserExistenceErrors: "ENABLED",
    };

    const appClientResult = await client.send(
      new CreateUserPoolClientCommand(appClientParams)
    );
    const clientId = appClientResult.UserPoolClient.ClientId;

    console.log(`✅ App Client created: ${clientId}`);

    // 3. Create Admin Group
    console.log("\n3. Creating admin group...");
    const adminGroupParams = {
      UserPoolId: userPoolId,
      GroupName: "admin",
      Description: "Administrators with full access to the system",
    };

    await client.send(new CreateGroupCommand(adminGroupParams));
    console.log("✅ Admin group created");

    // 4. Create Regular Users Group
    console.log("\n4. Creating users group...");
    const usersGroupParams = {
      UserPoolId: userPoolId,
      GroupName: "users",
      Description: "Regular users with limited access",
    };

    await client.send(new CreateGroupCommand(usersGroupParams));
    console.log("✅ Users group created");

    // 5. Display configuration
    console.log("\n🎉 Cognito setup complete!");
    console.log("\n📋 Configuration for your .env file:");
    console.log("=====================================");
    console.log(`COGNITO_USER_POOL_ID=${userPoolId}`);
    console.log(`COGNITO_CLIENT_ID=${clientId}`);
    console.log(`AWS_REGION=${REGION}`);
    console.log("");

    console.log("📋 Configuration for your frontend:");
    console.log("====================================");
    console.log(`userPoolId: "${userPoolId}"`);
    console.log(`userPoolWebClientId: "${clientId}"`);
    console.log(`region: "${REGION}"`);
    console.log("");

    console.log("📝 Next steps:");
    console.log("===============");
    console.log("1. Copy the environment variables to your .env file");
    console.log("2. Update your serverless.yml with these values");
    console.log("3. Create your first admin user in the AWS Console");
    console.log('4. Add the admin user to the "admin" group');
    console.log("5. Deploy your backend: npm run deploy");
    console.log("6. Configure your frontend with the Cognito settings");
  } catch (error) {
    console.error("❌ Error creating Cognito setup:", error.message);

    if (error.name === "CredentialsError") {
      console.log("\n💡 Make sure you have AWS credentials configured:");
      console.log("   - Run: aws configure");
      console.log(
        "   - Or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables"
      );
    }

    if (error.name === "UnauthorizedOperation") {
      console.log(
        "\n💡 Make sure your AWS user has the following permissions:"
      );
      console.log("   - cognito-idp:CreateUserPool");
      console.log("   - cognito-idp:CreateUserPoolClient");
      console.log("   - cognito-idp:CreateGroup");
    }
  }
}

// Check if AWS SDK is available
async function checkDependencies() {
  try {
    require("@aws-sdk/client-cognito-identity-provider");
    return true;
  } catch (error) {
    console.log("❌ Missing AWS SDK dependency");
    console.log(
      "📦 Please install it with: npm install @aws-sdk/client-cognito-identity-provider"
    );
    return false;
  }
}

// Main execution
async function main() {
  if (await checkDependencies()) {
    await createCognitoSetup();
  }
}

if (require.main === module) {
  main();
}

module.exports = { createCognitoSetup };
