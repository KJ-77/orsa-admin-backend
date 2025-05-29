const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

let dbCredentials = null;

// Function to get credentials from AWS Secrets Manager
const getDbCredentials = async () => {
  if (dbCredentials) return dbCredentials; // Cache the credentials
  
  const secret_name = "rds!db-9a50aa73-8600-4fd7-ac67-596f2d27da20";
  const client = new SecretsManagerClient({
    region: "eu-west-3",
  });

  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secret_name,
        VersionStage: "AWSCURRENT",
      })
    );
    
    dbCredentials = JSON.parse(response.SecretString);
    return dbCredentials;
  } catch (error) {
    console.error("Failed to retrieve database credentials from Secrets Manager:", error);
    throw error;
  }
};

// Default configuration (development)
const config = {
  db: {
    host: process.env.DB_HOST || "orsa-ecommerce.cjkwgkcwoyr0.eu-west-3.rds.amazonaws.com",
    user: process.env.DB_USER || "admin",
    password: process.env.DB_PASSWORD || "[[E<fWsd0CK02s6O-b)>tjxi3Fnp",
    database: process.env.DB_NAME || "Orsa",
    port: parseInt(process.env.DB_PORT || "3306", 10),
  },
  getDbCredentials,
};

module.exports = config;