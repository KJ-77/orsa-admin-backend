/**
 * secretsManager.js
 * Module to retrieve database credentials from AWS Secrets Manager
 */

const {
  SecretsManagerClient,
  GetSecretValueCommand,
  ListSecretsCommand,
} = require("@aws-sdk/client-secrets-manager");

// Initialize Secrets Manager client
const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || process.env.S3_REGION || "eu-west-3",
});

// Cache for storing retrieved credentials
let credentialsCache = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Debug function to list available secrets
 */
const listAvailableSecrets = async () => {
  try {
    console.log("Listing available secrets for debugging...");
    const command = new ListSecretsCommand({});
    const response = await secretsClient.send(command);

    console.log("Available secrets:");
    response.SecretList?.forEach((secret) => {
      console.log(`- Name: ${secret.Name}`);
      console.log(`  ARN: ${secret.ARN}`);
      console.log(`  Description: ${secret.Description || "No description"}`);
      console.log(`  Tags: ${JSON.stringify(secret.Tags || [])}`);
      console.log("---");
    });

    return response.SecretList;
  } catch (error) {
    console.error("Error listing secrets:", error);
    return [];
  }
};

/**
 * Retrieve database credentials from AWS Secrets Manager
 * @param {string} secretId - The ID or ARN of the secret
 * @returns {Promise<Object>} Database credentials
 */
const getDbCredentials = async (secretId) => {
  try {
    // Check if we have valid cached credentials
    if (credentialsCache && Date.now() < cacheExpiry) {
      console.log("Using cached database credentials");
      return credentialsCache;
    }
    console.log(
      `Retrieving database credentials from Secrets Manager: ${secretId}`
    );

    // First, let's try to find the secret by listing all secrets
    const availableSecrets = await listAvailableSecrets();
    const matchingSecret = availableSecrets.find(
      (secret) =>
        secret.Name === secretId ||
        secret.ARN === secretId ||
        secret.Name.includes(secretId) ||
        secretId.includes(secret.Name)
    );

    if (matchingSecret) {
      console.log(`Found matching secret: ${matchingSecret.Name}`);
      console.log(`Using ARN: ${matchingSecret.ARN}`);
      secretId = matchingSecret.ARN; // Use the full ARN
    } else {
      console.log(`No exact match found for: ${secretId}`);
      console.log("Trying with original secret ID...");
    }

    const command = new GetSecretValueCommand({
      SecretId: secretId,
    });

    const response = await secretsClient.send(command);
    if (!response.SecretString) {
      throw new Error("Secret value is empty or not a string");
    }

    console.log("Raw secret response received");

    // Parse the secret JSON
    const secretData = JSON.parse(response.SecretString);
    console.log("Secret data structure:", Object.keys(secretData)); // Handle both RDS-managed secrets and custom secrets
    let credentials;

    if (secretData.engine && secretData.dbInstanceIdentifier) {
      // RDS-managed secret format (full format)
      console.log("Detected RDS-managed secret format");
      console.log("RDS Engine:", secretData.engine);
      console.log("DB Instance:", secretData.dbInstanceIdentifier);

      credentials = {
        host: secretData.host,
        user: secretData.username,
        password: secretData.password,
        database: secretData.dbname,
        port: secretData.port || 3306,
      };
    } else if (secretData.username && secretData.password && secretData.host) {
      // Custom or simplified RDS secret format
      console.log("Detected custom/simplified secret format");

      credentials = {
        host: secretData.host,
        user: secretData.username,
        password: secretData.password,
        database: secretData.dbname || secretData.database,
        port: secretData.port || 3306,
      };
    } else if (secretData.username && secretData.password) {
      // Simplified RDS secret format (only username and password)
      console.log(
        "Detected simplified RDS secret format (username/password only)"
      );
      console.log("Using environment variables for connection details");

      credentials = {
        host:
          process.env.DB_HOST ||
          "orsa-ecommerce.cjkwgkcwoyr0.eu-west-3.rds.amazonaws.com",
        user: secretData.username,
        password: secretData.password,
        database: process.env.DB_NAME || "Orsa",
        port: parseInt(process.env.DB_PORT || "3306", 10),
      };
    } else {
      console.error(
        "Unknown secret format. Available fields:",
        Object.keys(secretData)
      );
      throw new Error(
        `Unknown secret format. Available fields: ${Object.keys(
          secretData
        ).join(", ")}`
      );
    }

    // Validate that we have all required credentials
    const requiredFields = ["host", "user", "password", "database"];
    const missingFields = requiredFields.filter((field) => !credentials[field]);

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required credentials: ${missingFields.join(", ")}`
      );
    } // Cache the credentials
    credentialsCache = credentials;
    cacheExpiry = Date.now() + CACHE_TTL;

    console.log("Database credentials retrieved and cached successfully");
    console.log("Credentials summary:", {
      host: credentials.host,
      user: credentials.user,
      database: credentials.database,
      port: credentials.port,
      passwordLength: credentials.password?.length || 0,
    });

    return credentialsCache;
  } catch (error) {
    console.error(
      "Error retrieving database credentials from Secrets Manager:",
      error
    );

    // Provide helpful error messages for common issues
    if (error.name === "ResourceNotFoundException") {
      console.error(`Secret not found: ${secretId}`);
      console.error("Please verify:");
      console.error("1. Secret name is correct");
      console.error("2. Secret exists in the eu-west-3 region");
      console.error("3. Lambda has permission to access this secret");

      // List available secrets for debugging
      await listAvailableSecrets();

      throw new Error(
        `Secret not found: ${secretId}. Check the secret name and region.`
      );
    } else if (error.name === "AccessDeniedException") {
      throw new Error(
        `Access denied to secret: ${secretId}. Check IAM permissions for Secrets Manager.`
      );
    } else if (error.name === "InvalidRequestException") {
      throw new Error(
        `Invalid request for secret: ${secretId}. Check the secret format.`
      );
    }

    throw new Error(
      `Failed to retrieve database credentials: ${error.message}`
    );
  }
};

/**
 * Clear the credentials cache (useful for testing or forcing refresh)
 */
const clearCache = () => {
  credentialsCache = null;
  cacheExpiry = 0;
  console.log("Database credentials cache cleared");
};

/**
 * Get database configuration with automatic secrets retrieval
 * @returns {Promise<Object>} Database configuration
 */
const getDbConfig = async () => {
  const secretId = process.env.DB_SECRET_ID;
  if (!secretId) {
    // Fallback to environment variables if no secret ID is provided
    console.log("No DB_SECRET_ID provided, using environment variables");
    return {
      host:
        process.env.DB_HOST ||
        "orsa-ecommerce.cjkwgkcwoyr0.eu-west-3.rds.amazonaws.com",
      user: process.env.DB_USER || "admin",
      password: process.env.DB_PASSWORD || "[[E<fWsd0CK02s6O-b)>tjxi3Fnp",
      database: process.env.DB_NAME || "Orsa",
      port: parseInt(process.env.DB_PORT || "3306", 10),
    };
  }

  console.log(`Using Secrets Manager with secret ID: ${secretId}`);

  // Retrieve credentials from Secrets Manager
  return await getDbCredentials(secretId);
};

module.exports = {
  getDbCredentials,
  getDbConfig,
  clearCache,
  listAvailableSecrets, // Export for debugging
};
