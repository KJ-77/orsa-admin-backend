/**
 * stripeService.js
 * This module contains functions for Stripe payment processing
 */

const Stripe = require("stripe");

// Initialize Stripe with secret key from environment variable
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create a payment intent with Stripe
 * @param {Object} params - Payment parameters
 * @param {number} params.amount - Amount in cents
 * @param {string} params.currency - Currency code (e.g., 'eur', 'usd')
 * @param {Array} params.items - Array of items being purchased
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} Payment intent object
 */
const createPaymentIntent = async ({
  amount,
  currency = "eur",
  items = [],
  metadata = {},
}) => {
  try {
    // Validate amount
    if (!amount || amount < 50) {
      throw new Error("Amount must be at least 50 cents");
    }

    // Create metadata with item information
    const paymentMetadata = {
      ...metadata,
      items: JSON.stringify(items),
      item_count: items.length.toString(),
    };

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Ensure it's an integer
      currency: currency.toLowerCase(), // Explicitly set currency
      metadata: paymentMetadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log(
      `Payment intent created with currency: ${currency.toLowerCase()}, amount: ${Math.round(
        amount
      )} cents`
    );

    return {
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    };
  } catch (error) {
    console.error("Error creating payment intent:", error);
    throw error;
  }
};

/**
 * Retrieve a payment intent by ID
 * @param {string} paymentIntentId - The payment intent ID
 * @returns {Promise<Object>} Payment intent object
 */
const getPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error("Error retrieving payment intent:", error);
    throw error;
  }
};

/**
 * Confirm a payment intent
 * @param {string} paymentIntentId - The payment intent ID
 * @param {Object} options - Confirmation options
 * @returns {Promise<Object>} Payment intent object
 */
const confirmPaymentIntent = async (paymentIntentId, options = {}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(
      paymentIntentId,
      options
    );
    return paymentIntent;
  } catch (error) {
    console.error("Error confirming payment intent:", error);
    throw error;
  }
};

/**
 * Construct event from Stripe webhook
 * @param {string} payload - Raw body from webhook
 * @param {string} signature - Stripe signature header
 * @returns {Object} Stripe event object
 */
const constructWebhookEvent = (payload, signature) => {
  try {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set");
    }

    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      endpointSecret
    );
    return event;
  } catch (error) {
    console.error("Error constructing webhook event:", error);
    throw error;
  }
};

/**
 * Handle successful payment
 * @param {Object} paymentIntent - The payment intent object
 * @returns {Promise<Object>} Processing result
 */
const handleSuccessfulPayment = async (paymentIntent) => {
  try {
    console.log("Processing successful payment:", {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
    });

    // Here you would typically:
    // 1. Update your database with the successful payment
    // 2. Send confirmation emails
    // 3. Update inventory
    // 4. Create order records

    // For now, we'll just log the success
    const result = {
      success: true,
      paymentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      processedAt: new Date().toISOString(),
    };

    // You can integrate with your orderService here
    // const orderData = JSON.parse(paymentIntent.metadata.items || '[]');
    // await createOrderFromPayment(paymentIntent, orderData);

    return result;
  } catch (error) {
    console.error("Error handling successful payment:", error);
    throw error;
  }
};

/**
 * Calculate order amount based on items
 * @param {Array} items - Array of items with price and quantity
 * @param {boolean} pricesInCents - Whether prices are already in cents (default: false)
 * @returns {number} Total amount in cents
 */
const calculateOrderAmount = (items, pricesInCents = false) => {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Items array is required");
    }

    const total = items.reduce((sum, item) => {
      if (!item.price || !item.quantity) {
        throw new Error("Each item must have price and quantity");
      }
      return sum + item.price * item.quantity;
    }, 0);

    // Convert to cents only if prices are in euros (main currency unit)
    // If already in cents, return as is
    return pricesInCents ? Math.round(total) : Math.round(total * 100);
  } catch (error) {
    console.error("Error calculating order amount:", error);
    throw error;
  }
};

module.exports = {
  createPaymentIntent,
  getPaymentIntent,
  confirmPaymentIntent,
  constructWebhookEvent,
  handleSuccessfulPayment,
  calculateOrderAmount,
};
