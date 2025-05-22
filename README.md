# Orsa Admin Backend

This project implements serverless CRUD APIs for the Orsa E-commerce platform using AWS Lambda, API Gateway, and RDS MySQL.

## Database Schema

The database contains the following tables:

- `users`: User information (customers)
- `products`: Product catalog
- `orders`: Order information with user reference
- `order_items`: Items in each order with product references

## API Endpoints

### Products

- GET /products - List all products
- GET /products/{id} - Get a specific product
- POST /products - Create a new product
- PUT /products/{id} - Update a product
- DELETE /products/{id} - Delete a product

### Users

- GET /users - List all users
- GET /users/{id} - Get a specific user
- POST /users - Create a new user
- PUT /users/{id} - Update a user
- DELETE /users/{id} - Delete a user

### Orders

- GET /orders - List all orders
- GET /orders/{id} - Get a specific order with its items
- POST /orders - Create a new order
- PUT /orders/{id} - Update an order
- DELETE /orders/{id} - Delete an order
- POST /orders/{id}/items - Add item to an order
- DELETE /orders/items/{itemId} - Remove item from an order

## Setup and Deployment

1. Update database connection details in both:

   - `config.js` - For local development
   - `serverless.yml` - For Lambda deployment

2. Update the VPC configuration in `serverless.yml`:

   - Replace security group IDs with your actual security group IDs
   - Replace subnet IDs with your actual subnet IDs

3. Deploy using Serverless Framework:
   ```
   serverless deploy
   ```

## Troubleshooting

### 500 Internal Server Error

If you're receiving 500 errors when calling the API, it could be due to:

1. **Database Connection Issues**:

   - Check that your RDS endpoint is correct in `config.js` and `serverless.yml`
   - Verify database credentials are correct
   - Make sure the Lambda security group has access to the RDS security group on port 3306
   - Ensure the RDS instance is running and accessible from the VPC

2. **Security Group Configuration**:

   - Lambda security group must have an outbound rule allowing all traffic
   - RDS security group must have an inbound rule allowing MySQL/Aurora (port 3306) from the Lambda security group

3. **VPC/Subnet Configuration**:

   - Lambda functions should be in private subnets with a NAT gateway for internet access
   - RDS should be in private subnets
   - Make sure all required VPC endpoints are configured

4. **Testing Database Connection**:

   - Run the `test-connection.js` script locally to verify credentials and network connectivity:
     ```
     node test-connection.js
     ```
   - Use the `/test-connection` API endpoint to check connection from Lambda

5. **Checking Logs**:
   - View CloudWatch logs for detailed error information:
     ```
     serverless logs -f functionName
     ```

## Security Considerations

- Database credentials should be stored securely using AWS Secrets Manager or Parameter Store
- Lambda functions run in a private VPC
- RDS instance is not publicly accessible
- API Gateway should be configured with proper authorizers for production

## Local Development

To run and test the functions locally:

1. First, make sure your environment variables are set correctly in the `.env` file:

   ```
   DB_HOST=your-rds-endpoint.rds.amazonaws.com
   DB_USER=admin
   DB_PASSWORD=your-password
   DB_NAME=orsa-ecommerce
   DB_PORT=3306
   ```

2. Use the serverless offline plugin for local development:

   ```
   npm install serverless-offline --save-dev
   serverless offline
   ```

3. Test specific functions locally:
   ```
   node test-connection.js
   ```

## RDS Security Group Configuration

For the Lambda functions to access the RDS database:

1. The RDS security group must allow inbound traffic on port 3306 from the Lambda security group
2. Example configuration in the AWS Console:
   - RDS Security Group Inbound Rule:
     - Type: MySQL/Aurora
     - Port Range: 3306
     - Source: [Lambda Security Group ID]
   - Lambda Security Group Outbound Rule:
     - Type: All Traffic
     - Destination: 0.0.0.0/0
