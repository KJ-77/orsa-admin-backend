/**
 * Dedicated Authentication Handler
 * Runs outside VPC to ensure internet connectivity for Cognito JWKS
 */

const { authenticate } = require("./authService");

/**
 * Create standardized API response
 */
const createResponse = (statusCode, data) => {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify(data),
  };
};

/**
 * Standalone authentication function for internal use
 * This function runs outside VPC to ensure Cognito connectivity
 */
exports.authenticateUser = async (event, context) => {
  try {
    console.log("Authentication request received");
    console.log("Event:", JSON.stringify(event, null, 2));
    console.log("Environment variables:", {
      COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
      COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
      COGNITO_REGION: process.env.COGNITO_REGION,
    });

    // Authenticate the user
    const user = await authenticate(event);
    console.log("Authentication successful for user:", user.username);

    // Return user data for use by other functions
    return createResponse(200, {
      authenticated: true,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        groups: user.groups,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("Authentication failed:", error.message);
    console.error("Error stack:", error.stack);

    return createResponse(401, {
      authenticated: false,
      error: "Unauthorized",
      message: error.message,
    });
  }
};

/**
 * Lambda authorizer function for API Gateway
 */
exports.authorizer = async (event, context) => {
  try {
    console.log(
      "Authorizer called with event:",
      JSON.stringify(event, null, 2)
    );

    const user = await authenticate(event);

    // Generate policy for API Gateway
    const policy = {
      principalId: user.userId,
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Allow",
            Resource: event.methodArn || "*",
          },
        ],
      },
      context: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        groups: JSON.stringify(user.groups),
        isAdmin: user.isAdmin.toString(),
      },
    };

    return policy;
  } catch (error) {
    console.error("Authorization failed:", error.message);
    throw new Error("Unauthorized");
  }
};
