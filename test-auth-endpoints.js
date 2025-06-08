const https = require("https");

// The JWT token you provided in your conversation
const JWT_TOKEN =
  "eyJraWQiOiI4RHEyQk5iWTdwVlwvWkM2K0dDVUVsWnA2QUpaUWdwSGtYbDh6bm90M3NiTT0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI1MTg5ZTBiZS1hMDcxLTcwOTItMzkxNy04NjE4YTJlOTNhNjMiLCJjb2duaXRvOmdyb3VwcyI6WyJhZG1pbnMiXSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLmV1LXdlc3QtMy5hbWF6b25hd3MuY29tXC9ldS13ZXN0LTNfaGpHZkxaNGVrIiwicGhvbmVfbnVtYmVyX3ZlcmlmaWVkIjp0cnVlLCJjb2duaXRvOnVzZXJuYW1lIjoiNTE4OWUwYmUtYTA3MS03MDkyLTM5MTctODYxOGEyZTkzYTYzIiwiZ2l2ZW5fbmFtZSI6IktoYWxpbCIsIm9yaWdpbl9qdGkiOiJhNzJhOWE2Yy01NjIyLTQ1ZmQtOGY1Ni00ZjQ3OWNmZmNmZTciLCJhdWQiOiIyOGVzdjhxNzdkbDNyMmdvaTFtc2tsMGlsYiIsImV2ZW50X2lkIjoiZDdjZTljZjEtMDU2OC00ZjllLWJmZmQtMjljNDliMDM0MmUwIiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE3NDkyMzc1OTYsInBob25lX251bWJlciI6Iis5NjE3MDc3OTk1MCIsImV4cCI6MTc0OTQwNjA0NywiaWF0IjoxNzQ5NDAyNDQ3LCJmYW1pbHlfbmFtZSI6IkFsIEphbWlsIiwianRpIjoiZjY3N2UzNWMtOGNjNy00NjI4LWEwNWEtNDEwNmYwZjQwNGQxIiwiZW1haWwiOiJramFtaWwyMDA0QGdtYWlsLmNvbSJ9.An0Rg0lotPh2q9coLgafbOmIvbaacvhx6_ZMtIpt7ys7hA--476l6CL1ypW2OjwPYI3vv0MDMeB9ve8GJzoHE77EKj0KhFTSAo9IuJVYc6MI7Pl-Hejq2J3BUO_pxdZ8VuC7ET4AmgNas8wiJ1FYO5yIyGAwDWem1V8_x_poKpcBc2Qmc62R0gtGqNEuI3Fgm7soMpfxHUCwfmNB7y5Y754MLUiPSo3-UO2pxO7Sv_Hrup91qKG9KauEuMci-BnwAeFoeM9wPK2HLjU6NVN9G7MIkQMMwGFyfHj0auPO97Hk408KXoxZai92PHfTGJfXfEBO-4V9I1X_ztaz_Sp1SA";

// Base URL for the API
const BASE_URL = "https://rlg7ahwue7.execute-api.eu-west-3.amazonaws.com";

function makeRequest(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "rlg7ahwue7.execute-api.eu-west-3.amazonaws.com",
      port: 443,
      path: path,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });
}

async function testAuthEndpoints() {
  console.log("🔍 Testing Orsa Admin Backend Authentication...\n");
  console.log("Base URL:", BASE_URL);
  console.log(
    "JWT Token (first 50 chars):",
    JWT_TOKEN.substring(0, 50) + "...\n"
  );

  // Test validate endpoint
  console.log("1️⃣  Testing /auth/validate endpoint...");
  try {
    const validateResponse = await makeRequest("/auth/validate", JWT_TOKEN);
    console.log("Status Code:", validateResponse.statusCode);
    console.log("Response Body:", validateResponse.body);
    console.log("✅ /auth/validate completed\n");
  } catch (error) {
    console.log("❌ Error testing /auth/validate:", error.message);
    console.log("");
  }

  // Test validate-admin endpoint
  console.log("2️⃣  Testing /auth/validate-admin endpoint...");
  try {
    const validateAdminResponse = await makeRequest(
      "/auth/validate-admin",
      JWT_TOKEN
    );
    console.log("Status Code:", validateAdminResponse.statusCode);
    console.log("Response Body:", validateAdminResponse.body);
    console.log("✅ /auth/validate-admin completed\n");
  } catch (error) {
    console.log("❌ Error testing /auth/validate-admin:", error.message);
    console.log("");
  }

  // Test without token (should fail)
  console.log("3️⃣  Testing /auth/validate without token (should fail)...");
  try {
    const noTokenResponse = await makeRequest("/auth/validate", "");
    console.log("Status Code:", noTokenResponse.statusCode);
    console.log("Response Body:", noTokenResponse.body);
    console.log("✅ No token test completed\n");
  } catch (error) {
    console.log("❌ Error testing without token:", error.message);
    console.log("");
  }
}

testAuthEndpoints().catch(console.error);
