/**
 * Local test script to verify JWT token validation
 */

// Set environment variables for testing
process.env.COGNITO_USER_POOL_ID = "eu-west-3_hjGfLZ4ek";
process.env.COGNITO_CLIENT_ID = "28esv8q77dl3r2goi1mskl0ilb";
process.env.AWS_REGION = "eu-west-3";

const { verifyToken } = require("./authService");

const token =
  "eyJraWQiOiI4RHEyQk5iWTdwVlwvWkM2K0dDVUVsWnA2QUpaUWdwSGtYbDh6bm90M3NiTT0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI1MTg5ZTBiZS1hMDcxLTcwOTItMzkxNy04NjE4YTJlOTNhNjMiLCJjb2duaXRvOmdyb3VwcyI6WyJhZG1pbnMiXSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLmV1LXdlc3QtMy5hbWF6b25hd3MuY29tXC9ldS13ZXN0LTNfaGpHZkxaNGVrIiwicGhvbmVfbnVtYmVyX3ZlcmlmaWVkIjp0cnVlLCJjb2duaXRvOnVzZXJuYW1lIjoiNTE4OWUwYmUtYTA3MS03MDkyLTM5MTctODYxOGEyZTkzYTYzIiwiZ2l2ZW5fbmFtZSI6IktoYWxpbCIsIm9yaWdpbl9qdGkiOiJhNzJhOWE2Yy01NjIyLTQ1ZmQtOGY1Ni00ZjQ3OWNmZmNmZTciLCJhdWQiOiIyOGVzdjhxNzdkbDNyMmdvaTFtc2tsMGlsYiIsImV2ZW50X2lkIjoiZDdjZTljZjEtMDU2OC00ZjllLWJmZmQtMjljNDliMDM0MmUwIiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE3NDkyMzc1OTYsInBob25lX251bWJlciI6Ijs5NjE3MDc3OTk1MCIsImV4cCI6MTc0OTMxNzY0MCwiaWF0IjoxNzQ5MzE0MDQwLCJmYW1pbHlfbmFtZSI6IkFsIEphbWlsIiwianRpIjoiODhkMmViZjAtZGVlNS00ZmE4LTkwOWEtY2E0YjgzZjRkYTU1IiwiZW1haWwiOiJramFtaWwyMDA0QGdtYWlsLmNvbSJ9.C8BSjYt5mzt3vlltt-zAL9XqPhxkuBKqotEbKodwsuXMKV0KGzNlQDTHIgxt7xYBY12SH34ZH-qBXFpYoHpd6INAPpxzSkRpy-BWtqlbp1fblm6DRa5ior8LYm4xQFDITW6OJuEAh4d4PkxeGLFPzDxj9_W6hFxhRzU3vXPI6x5fQSYlaGRdqbpZRhShyK_EgC3Eip4IvsLDdrs5el8JSo7UFarwvRUS8kikhK3Tg2ymE2d7PAsCryqkCXrDkHBM8PGK9mITQPDNW7oRuobciW867jRcfbyWLWrIiBNT21WvcYCFrb5z6cxRJOKF1xtW7dbKheu1AwlQNZPmhkwZ8g";

async function testTokenValidation() {
  console.log("🧪 Testing JWT token validation...");
  console.log("Environment variables:");
  console.log("- COGNITO_USER_POOL_ID:", process.env.COGNITO_USER_POOL_ID);
  console.log("- COGNITO_CLIENT_ID:", process.env.COGNITO_CLIENT_ID);
  console.log("- AWS_REGION:", process.env.AWS_REGION);
  console.log("");

  try {
    const user = await verifyToken(
      token,
      process.env.AWS_REGION,
      process.env.COGNITO_USER_POOL_ID,
      process.env.COGNITO_CLIENT_ID
    );

    console.log("✅ Token validation successful!");
    console.log("User details:", {
      userId: user.sub,
      email: user.email,
      groups: user["cognito:groups"],
      tokenUse: user.token_use,
      audience: user.aud,
      issuer: user.iss,
    });
  } catch (error) {
    console.error("❌ Token validation failed:", error.message);
    console.error("Full error:", error);
  }
}

testTokenValidation();
