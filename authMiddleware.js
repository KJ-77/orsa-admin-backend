/**
 * Authentication Middleware
 * Wraps Lambda handlers to enforce authentication
 * Uses external auth service to avoid VPC connectivity issues
 */

const { authenticate } = require("./authService");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

// Initialize Lambda client for invoking auth function
const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || "eu-west-3",
});

/**
 * Create standardized API response
 * @param {number} statusCode - HTTP status code
 * @param {Object|string} data - Response data or error message
 * @returns {Object} Formatted API Gateway response
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
 * Authenticate using external Lambda function (for VPC functions)
 * @param {Object} event - Lambda event
 * @returns {Promise<Object>} User object
 */
const authenticateExternal = async (event) => {
  const functionName = `${process.env.SERVICE || "orsa-admin-backend"}-${
    process.env.STAGE || "dev"
  }-authenticateUser`;

  try {
    console.log(`Invoking external auth function: ${functionName}`);
    console.log("Environment - SERVICE:", process.env.SERVICE, "STAGE:", process.env.STAGE);

    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: "RequestResponse",
      Payload: JSON.stringify(event),
    });

    const result = await lambdaClient.send(command);
    
    // Check for function invocation errors
    if (result.FunctionError) {
      console.error("Lambda function error:", result.FunctionError);
      throw new Error(`External auth function error: ${result.FunctionError}`);
    }

    const responsePayload = new TextDecoder().decode(result.Payload);
    console.log("Raw external auth response:", responsePayload);
    
    const response = JSON.parse(responsePayload);
    console.log("Parsed external auth response:", response);

    if (!response.body) {
      throw new Error("Invalid response format from external auth function");
    }

    const body = JSON.parse(response.body);

    if (response.statusCode !== 200 || !body.authenticated) {
      throw new Error(body.message || "Authentication failed");
    }

    return body.user;
  } catch (error) {
    console.error("External authentication failed:", error.message);
    console.error("Error details:", error);
    throw error;
  }
};

/**
 * Authentication middleware wrapper
 * @param {Function} handler - Original Lambda handler function
 * @param {Object} options - Middleware options
 * @returns {Function} Wrapped handler with authentication
 */
const withAuth = (handler, options = {}) => {
  return async (event, context) => {
    try {
      // Skip authentication for OPTIONS requests (CORS preflight)
      if (
        event.httpMethod === "OPTIONS" ||
        event.requestContext?.http?.method === "OPTIONS"
      ) {
        return createResponse(200, { message: "CORS preflight" });
      }

      // Skip authentication for test endpoint in development
      if (options.skipAuth && process.env.STAGE === "dev") {
        return await handler(event, context);
      }      // Determine authentication method
      // For VPC functions, prefer external authentication
      let user;

      if (process.env.VPC_FUNCTION === "true" || options.useExternalAuth) {
        console.log("Using external authentication for VPC function");
        try {
          user = await authenticateExternal(event);
          console.log("External authentication successful");
        } catch (externalAuthError) {
          console.log("External authentication failed:", externalAuthError.message);
          
          // Fallback to direct authentication if external fails
          console.log("Attempting direct authentication as fallback");
          try {
            user = await authenticate(event);
            console.log("Direct authentication fallback successful");
          } catch (directAuthError) {
            console.error("Both external and direct authentication failed");
            console.error("External error:", externalAuthError.message);
            console.error("Direct error:", directAuthError.message);
            throw externalAuthError; // Throw the original external auth error
          }
        }
      } else {
        // For non-VPC functions, use direct authentication
        console.log("Using direct authentication for non-VPC function");
        try {
          user = await authenticate(event);
          console.log("Direct authentication successful");
        } catch (directAuthError) {
          console.log("Direct authentication failed:", directAuthError.message);
          throw directAuthError;
        }
      }

      // Add user information to event for handler access
      event.user = user;
      event.requestContext = event.requestContext || {};
      event.requestContext.authorizer = {
        userId: user.userId,
        username: user.username,
        email: user.email,
        groups: user.groups,
        isAdmin: user.isAdmin,
      };

      // Check admin access if required
      if (options.requireAdmin && !user.isAdmin) {
        return createResponse(403, {
          error: "Forbidden",
          message: "Admin access required",
        });
      }

      // Call original handler
      return await handler(event, context);
    } catch (error) {
      console.error("Authentication middleware error:", error.message);

      // Return appropriate error response
      if (
        error.message.includes("No authorization header") ||
        error.message.includes("Invalid authorization header") ||
        error.message.includes("Token verification failed")
      ) {
        return createResponse(401, {
          error: "Unauthorized",
          message: "Authentication required",
        });
      }

      if (error.message.includes("Cognito configuration missing")) {
        return createResponse(500, {
          error: "Internal Server Error",
          message: "Authentication service not configured",
        });
      }

      return createResponse(500, {
        error: "Internal Server Error",
        message: "Authentication failed",
      });
    }
  };
};

/**
 * Admin-only middleware wrapper
 * @param {Function} handler - Original Lambda handler function
 * @returns {Function} Wrapped handler requiring admin access
 */
const withAdminAuth = (handler) => {
  return withAuth(handler, { requireAdmin: true });
};

/**
 * Optional authentication wrapper (for endpoints that work with or without auth)
 * @param {Function} handler - Original Lambda handler function
 * @returns {Function} Wrapped handler with optional authentication
 */
const withOptionalAuth = (handler) => {
  return async (event, context) => {
    try {
      // Try to authenticate, but don't fail if no token
      const authHeader =
        event.headers?.authorization || event.headers?.Authorization;

      if (authHeader) {
        const user = await authenticate(event);
        event.user = user;
        event.requestContext = event.requestContext || {};
        event.requestContext.authorizer = {
          userId: user.userId,
          username: user.username,
          email: user.email,
          groups: user.groups,
          isAdmin: user.isAdmin,
        };
      }

      return await handler(event, context);
    } catch (error) {
      // If authentication fails, continue without user context
      console.warn("Optional authentication failed:", error.message);
      return await handler(event, context);
    }
  };
};

module.exports = {
  withAuth,
  withAdminAuth,
  withOptionalAuth,
  createResponse,
};
