/**
 * test-connection.js
 * This script tests the database connection locally
 * to validate credentials and network connectivity
 */

const mysql = require("mysql2/promise");
const config = require("./config");
const dns = require("dns").promises;
const net = require("net");

async function testConnection() {
  console.log("\n🔍 MYSQL CONNECTION DIAGNOSTIC TOOL 🔍\n");
  console.log("Testing database connection with the following parameters:");
  console.log({
    host: config.db.host,
    user: config.db.user,
    database: config.db.database,
    port: config.db.port,
    passwordProvided: !!config.db.password,
  });

  console.log("\n📡 Step 1: DNS Resolution Test");
  try {
    console.log(`Resolving DNS for: ${config.db.host}`);
    const dnsResult = await dns.lookup(config.db.host);
    console.log(`✅ DNS resolution successful. IP: ${dnsResult.address}`);

    console.log("\n🔌 Step 2: TCP Connection Test");
    console.log(
      `Testing TCP connection to ${dnsResult.address}:${config.db.port}`
    );

    // Create a promise-based TCP connection test
    const tcpTest = await new Promise((resolve) => {
      const socket = net.createConnection(config.db.port, dnsResult.address);
      let success = false;

      socket.setTimeout(5000); // 5 second timeout

      socket.on("connect", () => {
        console.log(
          `✅ TCP connection established to ${dnsResult.address}:${config.db.port}`
        );
        success = true;
        socket.end();
      });

      socket.on("timeout", () => {
        console.log(
          `❌ TCP connection timed out to ${dnsResult.address}:${config.db.port}`
        );
        socket.destroy();
      });

      socket.on("error", (err) => {
        console.log(`❌ TCP connection failed: ${err.message}`);
      });

      socket.on("close", () => {
        resolve(success);
      });
    });

    if (!tcpTest) {
      console.log(
        "\n🛑 Cannot proceed with MySQL test because TCP connection failed"
      );
      console.log(
        "This indicates a network connectivity or security group issue."
      );
      console.log("Common causes:");
      console.log(
        "1. RDS security group doesn't allow inbound traffic from your IP"
      );
      console.log("2. Network ACLs are blocking traffic");
      console.log("3. RDS instance is not publicly accessible");
      return false;
    }
  } catch (dnsError) {
    console.error(`❌ DNS resolution failed: ${dnsError.message}`);
    console.log(
      "The hostname could not be resolved. Check if your RDS endpoint is correct."
    );
    return false;
  }

  try {
    // Try to connect to the database
    console.log("Attempting connection...");
    const connection = await mysql.createConnection({
      host: config.db.host,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      port: config.db.port,
      connectTimeout: 10000, // 10 second timeout
    });

    console.log("✅ Connected successfully!");

    // Run a simple test query
    console.log("Running a test query...");
    const [rows] = await connection.execute("SELECT 1 as testResult");
    console.log("✅ Query successful:", rows);

    // Close the connection
    await connection.end();
    console.log("✅ Connection closed properly");

    return true;
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    if (error.code === "ENOTFOUND") {
      console.error(
        "   The hostname could not be resolved. Check if your RDS endpoint is correct."
      );
    } else if (error.code === "ETIMEDOUT") {
      console.error("   Connection timed out. Check if:");
      console.error("   - The database is running");
      console.error("   - Security groups allow access from your IP");
      console.error("   - Network ACLs allow the traffic");
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("   Access denied. Check your username and password.");
    } else if (error.code === "ECONNREFUSED") {
      console.error("   Connection refused. Check if:");
      console.error("   - The database server is running");
      console.error("   - The specified port is correct");
      console.error("   - Firewall isn't blocking connections");
    }

    return false;
  }
}

testConnection();
