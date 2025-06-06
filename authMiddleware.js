/**
 * Authentication Middleware
 * Wraps Lambda handlers to enforce authentication
 */

const { authenticate } = require("./authService");

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
      }

      // Authenticate user
      const user = await authenticate(event);

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
