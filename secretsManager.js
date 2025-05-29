/**
 * secretsManager.js
 * Module to retrieve database credentials from AWS Secrets Manager
 */

const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

// Initialize Secrets Manager client
const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || process.env.S3_REGION || "eu-west-3",
});

// Cache for storing retrieved credentials
let credentialsCache = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Retrieve database credentials from AWS Secrets Manager
 * @param {string} secretId - The ID or ARN of the secret
 * @returns {Promise<Object>} Database credentials
 */
const getDbCredentials = async (secretId) => {
  try {
    // Check if we have valid cached credentials
    if (credentialsCache && Date.now() < cacheExpiry) {
      console.log('Using cached database credentials');
      return credentialsCache;
    }

    console.log(`Retrieving database credentials from Secrets Manager: ${secretId}`);

    const command = new GetSecretValueCommand({
      SecretId: secretId,
    });

    const response = await secretsClient.send(command);
    
    if (!response.SecretString) {
      throw new Error('Secret value is empty or not a string');
    }

    // Parse the secret JSON
    const secretData = JSON.parse(response.SecretString);
    
    // Validate required fields
    const requiredFields = ['username', 'password', 'host', 'dbname'];
    const missingFields = requiredFields.filter(field => !secretData[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields in secret: ${missingFields.join(', ')}`);
    }

    // Cache the credentials
    credentialsCache = {
      host: secretData.host,
      user: secretData.username,
      password: secretData.password,
      database: secretData.dbname,
      port: secretData.port || 3306,
    };
    
    cacheExpiry = Date.now() + CACHE_TTL;
    
    console.log('Database credentials retrieved and cached successfully');
    return credentialsCache;

  } catch (error) {
    console.error('Error retrieving database credentials from Secrets Manager:', error);
    
    // Provide helpful error messages for common issues
    if (error.name === 'ResourceNotFoundException') {
      throw new Error(`Secret not found: ${secretId}. Please check the secret ID and region.`);
    } else if (error.name === 'AccessDeniedException') {
      throw new Error(`Access denied to secret: ${secretId}. Please check IAM permissions.`);
    } else if (error.name === 'InvalidRequestException') {
      throw new Error(`Invalid request for secret: ${secretId}. Please check the secret format.`);
    }
    
    throw new Error(`Failed to retrieve database credentials: ${error.message}`);
  }
};

/**
 * Clear the credentials cache (useful for testing or forcing refresh)
 */
const clearCache = () => {
  credentialsCache = null;
  cacheExpiry = 0;
  console.log('Database credentials cache cleared');
};

/**
 * Get database configuration with automatic secrets retrieval
 * @returns {Promise<Object>} Database configuration
 */
const getDbConfig = async () => {
  const secretId = process.env.DB_SECRET_ID;
  
  if (!secretId) {
    // Fallback to environment variables if no secret ID is provided
    console.log('No DB_SECRET_ID provided, using environment variables');
    return {
      host: process.env.DB_HOST || "orsa-ecommerce.cjkwgkcwoyr0.eu-west-3.rds.amazonaws.com",
      user: process.env.DB_USER || "admin",
      password: process.env.DB_PASSWORD || "[[E<fWsd0CK02s6O-b)>tjxi3Fnp",
      database: process.env.DB_NAME || "Orsa",
      port: parseInt(process.env.DB_PORT || "3306", 10),
    };
  }

  // Retrieve credentials from Secrets Manager
  return await getDbCredentials(secretId);
};

module.exports = {
  getDbCredentials,
  getDbConfig,
  clearCache,
};
