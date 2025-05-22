-- fix-permissions.sql
-- This script grants database access to the admin user from the Lambda VPC CIDR range
-- Create the user if it doesn't exist
CREATE USER IF NOT EXISTS 'admin' @'172.31.%' IDENTIFIED BY 'q[8w07uvuNh[QU|SI2WEeO)pPz8$';
-- Grant privileges
GRANT ALL PRIVILEGES ON `orsa-ecommerce`.* TO 'admin' @'172.31.%';
-- Apply changes
FLUSH PRIVILEGES;