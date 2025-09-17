/**
 * Simple Stripe payment handler for testing
 * This bypasses any VPC/DB issues for payment processing
 */

const Stripe = require('stripe');

// Test handler for payment intent creation
exports.testStripePayment = async (event) => {
  console.log('Starting payment intent creation test');
  
  try {
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    console.log('Stripe initialized successfully');
    
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    console.log('Request body:', body);
    
    // Create a simple payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: body.amount || 2500,
      currency: body.currency || 'eur',
      metadata: {
        test: 'true',
        source: 'orsa_test'
      }
    });
    
    console.log('Payment intent created:', paymentIntent.id);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      })
    };
    
  } catch (error) {
    console.error('Error in test payment:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Payment test failed',
        message: error.message,
        details: error.stack
      })
    };
  }
};
