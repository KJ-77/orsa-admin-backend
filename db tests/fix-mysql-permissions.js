/**
 * fix-mysql-permissions.js
 * This script updates MySQL user permissions to allow connections from Lambda functions
 */

const mysql = require("mysql2/promise");
const config = require("./config");

async function fixMySQLPermissions() {
  console.log("🔧 MySQL Permission Fix Tool");
  console.log(
    "This tool will grant access to the admin user from the VPC CIDR range"
  );

  try {
    console.log("Connecting to MySQL with current credentials...");
    const connection = await mysql.createConnection({
      host: config.db.host,
      user: config.db.user,
      password: config.db.password,
      port: config.db.port,
      // Skip database selection as we need to modify user permissions
      multipleStatements: true, // Allow multiple statements
    });

    console.log("✅ Successfully connected to MySQL!");

    // Grant permissions to the admin user for all IPs in the VPC CIDR range
    // 172.31.0.0/16 is a common VPC CIDR in AWS, adjust if your VPC uses a different range
    console.log(
      "Granting permissions to admin user from 172.31.%.% (VPC CIDR range)..."
    );

    // First, check if the user with the wildcard host already exists
    const [userCheck] = await connection.execute(
      `SELECT user, host FROM mysql.user WHERE user = 'admin' AND host = '172.31.%'`
    );

    if (userCheck.length > 0) {
      console.log(
        "User admin@172.31.% already exists, updating permissions..."
      );
      await connection.execute(
        `GRANT ALL PRIVILEGES ON \`${config.db.database}\`.* TO 'admin'@'172.31.%'`
      );
    } else {
      console.log("Creating new user permission for admin@172.31.%...");
      await connection.execute(
        `CREATE USER 'admin'@'172.31.%' IDENTIFIED BY '${config.db.password}';
         GRANT ALL PRIVILEGES ON \`${config.db.database}\`.* TO 'admin'@'172.31.%'`
      );
    }

    // Apply the changes
    await connection.execute("FLUSH PRIVILEGES");

    console.log("✅ Permissions updated successfully!");
    console.log(
      "The admin user can now connect from any IP in the 172.31.%.% range"
    );

    // Close the connection
    await connection.end();

    return true;
  } catch (error) {
    console.error("❌ Error updating permissions:", error.message);

    if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.error(
        "You do not have sufficient privileges to modify user permissions."
      );
      console.error(
        "Try connecting with a MySQL root or admin user that has GRANT privileges."
      );
      console.error("\nAlternative manual fix:");
      console.error(
        "Connect to your MySQL database as root and run these commands:"
      );
      console.error(
        `CREATE USER 'admin'@'172.31.%' IDENTIFIED BY 'your_password';`
      );
      console.error(
        `GRANT ALL PRIVILEGES ON \`${config.db.database}\`.* TO 'admin'@'172.31.%';`
      );
      console.error("FLUSH PRIVILEGES;");
    }

    return false;
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  fixMySQLPermissions();
}

module.exports = { fixMySQLPermissions };
