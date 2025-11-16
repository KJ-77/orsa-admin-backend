const AWS = require('aws-sdk');
const sns = new AWS.SNS();

/**
 * Publishes order created event to SNS topic
 * @param {Object} orderData - Order information
 * @param {number} orderData.orderId - The created order ID
 * @param {number} orderData.userId - User ID
 * @param {string} orderData.userName - User name
 * @param {string} orderData.userLocation - User location
 * @param {number} orderData.totalPrice - Total order price
 * @param {string} orderData.stripeId - Stripe payment intent ID
 * @param {string} orderData.orderStatus - Order status
 * @returns {Promise<void>}
 */
async function publishOrderCreated(orderData) {
  const topicArn = process.env.ORDER_CREATED_TOPIC_ARN;

  if (!topicArn) {
    console.error('ORDER_CREATED_TOPIC_ARN environment variable not set');
    throw new Error('SNS topic ARN not configured');
  }

  const message = {
    orderId: orderData.orderId,
    userId: orderData.userId,
    userName: orderData.userName,
    userLocation: orderData.userLocation,
    totalPrice: orderData.totalPrice,
    stripeId: orderData.stripeId,
    orderStatus: orderData.orderStatus || 'In Progress',
    createdAt: new Date().toISOString(),
    eventType: 'ORDER_CREATED',
    version: '1.0'
  };

  try {
    const result = await sns.publish({
      TopicArn: topicArn,
      Message: JSON.stringify(message),
      Subject: 'New Order Created',
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: 'ORDER_CREATED'
        },
        orderId: {
          DataType: 'Number',
          StringValue: String(orderData.orderId)
        }
      }
    }).promise();

    console.log('Order created event published to SNS:', {
      messageId: result.MessageId,
      orderId: orderData.orderId,
      topicArn: topicArn
    });

    return result;
  } catch (error) {
    console.error('Failed to publish order created event to SNS:', {
      error: error.message,
      orderId: orderData.orderId,
      topicArn: topicArn
    });
    // Don't throw - we don't want SNS failures to break order creation
    // The order is already committed to the database
    // Log the error for monitoring and manual intervention if needed
  }
}

module.exports = {
  publishOrderCreated
};
