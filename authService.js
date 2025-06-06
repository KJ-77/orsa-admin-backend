/**
 * Authentication Service for AWS Cognito JWT Token Validation
 * Handles JWT token verification and user authorization
 */

const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

// Cache for JWKS client to avoid repeated requests
let jwksClientInstance = null;

/**
 * Initialize JWKS client for retrieving public keys
 * @param {string} region - AWS region
 * @param {string} userPoolId - Cognito User Pool ID
 * @returns {Object} JWKS client instance
 */
const getJwksClient = (region, userPoolId) => {
  if (!jwksClientInstance) {
    jwksClientInstance = jwksClient({
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
      jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
    });
  }
  return jwksClientInstance;
};

/**
 * Get signing key from JWKS
 * @param {string} kid - Key ID from JWT header
 * @param {Object} client - JWKS client instance
 * @returns {Promise<string>} Public key for verification
 */
const getKey = (kid, client) => {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) {
        reject(err);
      } else {
        const signingKey = key.publicKey || key.rsaPublicKey;
        resolve(signingKey);
      }
    });
  });
};

/**
 * Verify JWT token from AWS Cognito
 * @param {string} token - JWT token to verify
 * @param {string} region - AWS region
 * @param {string} userPoolId - Cognito User Pool ID
 * @param {string} clientId - Cognito App Client ID
 * @returns {Promise<Object>} Decoded and verified token payload
 */
const verifyToken = async (token, region, userPoolId, clientId) => {
  try {
    // Decode token header to get key ID
    const decodedHeader = jwt.decode(token, { complete: true });

    if (!decodedHeader || !decodedHeader.header || !decodedHeader.header.kid) {
      throw new Error("Invalid token header");
    }

    const kid = decodedHeader.header.kid;
    const client = getJwksClient(region, userPoolId);

    // Get public key for verification
    const signingKey = await getKey(kid, client);

    // Verify token
    const payload = jwt.verify(token, signingKey, {
      audience: clientId,
      issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
      algorithms: ["RS256"],
    });

    // Additional validation
    if (payload.token_use !== "access" && payload.token_use !== "id") {
      throw new Error("Invalid token use");
    }

    return payload;
  } catch (error) {
    console.error("Token verification failed:", error.message);
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

/**
 * Extract token from Authorization header
 * @param {Object} event - Lambda event object
 * @returns {string} JWT token
 */
const extractToken = (event) => {
  const authHeader =
    event.headers?.authorization || event.headers?.Authorization;

  if (!authHeader) {
    throw new Error("No authorization header found");
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    throw new Error(
      "Invalid authorization header format. Expected: Bearer <token>"
    );
  }

  return parts[1];
};

/**
 * Authentication middleware for Lambda functions
 * @param {Object} event - Lambda event object
 * @returns {Promise<Object>} User information from token
 */
const authenticate = async (event) => {
  try {
    // Get configuration from environment variables
    const region = process.env.AWS_REGION || "eu-west-3";
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const clientId = process.env.COGNITO_CLIENT_ID;

    if (!userPoolId || !clientId) {
      throw new Error(
        "Cognito configuration missing. Please set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID environment variables."
      );
    }

    // Extract and verify token
    const token = extractToken(event);
    const payload = await verifyToken(token, region, userPoolId, clientId);

    // Return user information
    return {
      userId: payload.sub,
      username: payload.username || payload["cognito:username"],
      email: payload.email,
      groups: payload["cognito:groups"] || [],
      tokenUse: payload.token_use,
      clientId: payload.aud,
      isAdmin: (payload["cognito:groups"] || []).includes("admin"),
    };
  } catch (error) {
    console.error("Authentication failed:", error.message);
    throw error;
  }
};

/**
 * Generate IAM policy for API Gateway Lambda authorizer
 * @param {string} effect - Allow or Deny
 * @param {string} resource - API Gateway resource ARN
 * @param {Object} context - Additional context to pass to Lambda
 * @returns {Object} IAM policy document
 */
const generatePolicy = (effect, resource, context = {}) => {
  return {
    principalId: context.userId || "user",
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context: context,
  };
};

/**
 * Lambda Authorizer function
 * @param {Object} event - API Gateway authorizer event
 * @returns {Object} IAM policy allowing/denying access
 */
const authorizer = async (event) => {
  try {
    console.log("Authorizer event:", JSON.stringify(event, null, 2));

    const token =
      event.authorizationToken?.replace("Bearer ", "") ||
      event.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      throw new Error("No token provided");
    }

    // Get configuration
    const region = process.env.AWS_REGION || "eu-west-3";
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const clientId = process.env.COGNITO_CLIENT_ID;

    if (!userPoolId || !clientId) {
      throw new Error("Cognito configuration missing");
    }

    // Verify token
    const payload = await verifyToken(token, region, userPoolId, clientId);

    // Create context for Lambda functions
    const context = {
      userId: payload.sub,
      username: payload.username || payload["cognito:username"],
      email: payload.email,
      groups: JSON.stringify(payload["cognito:groups"] || []),
      isAdmin: (payload["cognito:groups"] || []).includes("admin").toString(),
    };

    // Generate policy
    return generatePolicy("Allow", event.methodArn, context);
  } catch (error) {
    console.error("Authorization failed:", error.message);

    // For debugging in development
    if (process.env.STAGE === "dev") {
      console.error("Full error:", error);
    }

    // Return deny policy
    return generatePolicy("Deny", event.methodArn);
  }
};

module.exports = {
  authenticate,
  authorizer,
  verifyToken,
  extractToken,
  generatePolicy,
};
