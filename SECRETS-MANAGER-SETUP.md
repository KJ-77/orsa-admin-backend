# AWS Secrets Manager Database Credentials Setup Guide

This guide explains how to set up automatic database password rotation using AWS Secrets Manager, so your APIs will always use the latest password without requiring redeployment.

## Overview

With Secrets Manager integration:

- ✅ **Automatic password rotation** - Your APIs continue working even when passwords change
- ✅ **Secure credential storage** - No hardcoded passwords in code or environment variables
- ✅ **Credential caching** - Reduces API calls and improves performance
- ✅ **Automatic retry** - If authentication fails, automatically fetches fresh credentials

## Step 1: Create a Secret in AWS Secrets Manager

### Option A: Using AWS Console

1. Go to AWS Secrets Manager in the AWS Console
2. Click "Store a new secret"
3. Select "Credentials for RDS database"
4. Fill in your database details:
   - **Username**: `admin` (or your database username)
   - **Password**: Your current database password
   - **Database**: Select your RDS instance or enter details manually
5. Give your secret a name like `orsa-database-credentials`
6. Enable automatic rotation if desired
7. Click "Store"

### Option B: Using AWS CLI

```bash
# Create a secret with database credentials
aws secretsmanager create-secret \
  --name "orsa-database-credentials" \
  --description "Database credentials for Orsa application" \
  --secret-string '{
    "username": "admin",
    "password": "your-current-password",
    "host": "orsa-ecommerce.cjkwgkcwoyr0.eu-west-3.rds.amazonaws.com",
    "dbname": "Orsa",
    "port": 3306
  }' \
  --region eu-west-3
```

## Step 2: Get Your Secret ARN or Name

After creating the secret, note down either:

- **Secret ARN**: `arn:aws:secretsmanager:eu-west-3:123456789012:secret:orsa-database-credentials-AbCdEf`
- **Secret Name**: `orsa-database-credentials`

## Step 3: Update Your Serverless Configuration

### Update serverless.yml

Uncomment and set the `DB_SECRET_ID` environment variable:

```yaml
environment:
  # Enable Secrets Manager (choose one option):

  # Option 1: Use Secret ARN (most secure)
  DB_SECRET_ID: "arn:aws:secretsmanager:eu-west-3:YOUR_ACCOUNT:secret:orsa-database-credentials-XXXXXX"

  # Option 2: Use Secret Name (simpler)
  DB_SECRET_ID: "orsa-database-credentials"

  # Fallback environment variables (used if DB_SECRET_ID is not set)
  DB_HOST: "orsa-ecommerce.cjkwgkcwoyr0.eu-west-3.rds.amazonaws.com"
  DB_USER: "admin"
  DB_PASSWORD: ".c>0VXNH0_JA4Qa)vy(PeI5Ijw#R"
  DB_NAME: "Orsa"
  DB_PORT: "3306"
```

## Step 4: Install Dependencies and Deploy

```bash
# Install the Secrets Manager SDK
npm install

# Deploy your updated configuration
npm run deploy
```

## Step 5: Test the Integration

```bash
# Test Secrets Manager integration
node test-secrets-manager.js
```

## Secret JSON Format

Your secret must contain JSON with these exact field names:

```json
{
  "username": "admin",
  "password": "your-database-password",
  "host": "orsa-ecommerce.cjkwgkcwoyr0.eu-west-3.rds.amazonaws.com",
  "dbname": "Orsa",
  "port": 3306
}
```

**Important**: The field names must match exactly (`username`, not `user`; `dbname`, not `database`).

## How It Works

1. **First Request**: Lambda fetches credentials from Secrets Manager
2. **Caching**: Credentials are cached for 5 minutes to improve performance
3. **Connection Pool**: Database connection pool is created with current credentials
4. **Auto-Retry**: If authentication fails, the system:
   - Clears the credential cache
   - Fetches fresh credentials from Secrets Manager
   - Recreates the connection pool
   - Retries the failed operation

## Setting Up Automatic Password Rotation

### Enable Rotation in AWS Console

1. Go to your secret in AWS Secrets Manager
2. Click "Edit rotation"
3. Enable automatic rotation
4. Choose rotation interval (e.g., 30 days)
5. Select or create a Lambda function for rotation
6. Save changes

### Rotation Lambda Function

AWS can automatically create a rotation Lambda function for RDS databases. This function will:

- Generate a new password
- Update the database user password
- Update the secret with the new password
- Test the new credentials

## Troubleshooting

### Common Issues

#### 1. "Secret not found" Error

- Verify the secret name/ARN is correct
- Ensure the secret exists in the same region as your Lambda
- Check that the DB_SECRET_ID environment variable is set correctly

#### 2. "Access denied to secret" Error

- Verify IAM permissions in serverless.yml include `secretsmanager:GetSecretValue`
- Check that the secret resource ARN pattern matches your secret
- Ensure your Lambda execution role has the necessary permissions

#### 3. "Invalid request" Error

- Verify the secret contains valid JSON
- Check that all required fields are present (`username`, `password`, `host`, `dbname`)
- Ensure field names match exactly (case-sensitive)

#### 4. Database Connection Still Fails

- Test the credentials manually to ensure they work
- Check VPC configuration and security groups
- Verify the database host and port are correct

### Debug Commands

```bash
# Test your secret access
aws secretsmanager get-secret-value \
  --secret-id "orsa-database-credentials" \
  --region eu-west-3

# Test database connection with current password
mysql -h orsa-ecommerce.cjkwgkcwoyr0.eu-west-3.rds.amazonaws.com \
  -u admin -p Orsa

# Check Lambda logs
aws logs tail /aws/lambda/orsa-admin-backend-dev-testDbConnection --follow
```

## Cost Considerations

### Secrets Manager Pricing

- **Secret storage**: $0.40 per secret per month
- **API calls**: $0.05 per 10,000 requests
- **Rotation**: No additional charge for the rotation feature

### Optimization

- Credential caching reduces API calls (cached for 5 minutes)
- Each Lambda container maintains its own cache
- Cold starts will fetch fresh credentials

## Migration Strategy

### Phase 1: Deploy with Fallback

1. Deploy the updated code with `DB_SECRET_ID` commented out
2. Verify everything still works with environment variables
3. Create and test your secret

### Phase 2: Enable Secrets Manager

1. Uncomment `DB_SECRET_ID` in serverless.yml
2. Deploy the update
3. Test all API endpoints
4. Monitor CloudWatch logs for any issues

### Phase 3: Clean Up (Optional)

1. Remove hardcoded passwords from serverless.yml
2. Keep them commented for emergency fallback
3. Set up monitoring and alerting

## Security Best Practices

1. **Least Privilege**: Grant only `secretsmanager:GetSecretValue` permission
2. **Resource Restrictions**: Limit IAM permissions to specific secret ARNs
3. **Rotation**: Enable automatic password rotation
4. **Monitoring**: Set up CloudWatch alarms for secret access
5. **Backup**: Keep emergency access credentials stored securely offline

## Example IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:eu-west-3:123456789012:secret:orsa-database-credentials-*"
      ]
    }
  ]
}
```

This setup ensures your database credentials are always current and your APIs remain functional even during password rotations!
