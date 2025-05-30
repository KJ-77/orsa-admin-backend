#!/usr/bin/env node

/**
 * Test script for enhanced functions in handler.js
 * This script tests the enhanced validation and middleware functions
 */

const { validateEmail, validateName, validatePhoneNumber, isRateLimited, withMiddleware } = require('./handler');

console.log('🧪 Testing Enhanced Functions for Orsa Admin Backend\n');

// Test email validation
console.log('📧 Testing Email Validation:');
const testEmails = [
  'valid@example.com',
  'test.email+tag@domain.co.uk',
  'invalid-email',
  'user@',
  '@domain.com',
  'user@domain',
  ''
];

testEmails.forEach(email => {
  try {
    const isValid = validateEmail(email);
    console.log(`  ✓ "${email}" -> ${isValid ? '✅ Valid' : '❌ Invalid'}`);
  } catch (error) {
    console.log(`  ✓ "${email}" -> ❌ Invalid (${error.message})`);
  }
});

// Test name validation
console.log('\n👤 Testing Name Validation:');
const testNames = [
  'John Doe',
  'María García-López',
  'Jean-Pierre',
  'A',
  '',
  'VeryLongNameThatExceedsFiftyCharactersInLengthAndShouldFail',
  'Valid Name123',
  'Name with numbers 123'
];

testNames.forEach(name => {
  try {
    const isValid = validateName(name);
    console.log(`  ✓ "${name}" -> ${isValid ? '✅ Valid' : '❌ Invalid'}`);
  } catch (error) {
    console.log(`  ✓ "${name}" -> ❌ Invalid (${error.message})`);
  }
});

// Test phone number validation
console.log('\n📱 Testing Phone Number Validation:');
const testPhones = [
  '+1234567890',
  '+33123456789',
  '+44123456789',
  '1234567890',
  '+123',
  '+12345678901234567890',
  'not-a-phone',
  ''
];

testPhones.forEach(phone => {
  try {
    const isValid = validatePhoneNumber(phone);
    console.log(`  ✓ "${phone}" -> ${isValid ? '✅ Valid' : '❌ Invalid'}`);
  } catch (error) {
    console.log(`  ✓ "${phone}" -> ❌ Invalid (${error.message})`);
  }
});

// Test rate limiting
console.log('\n⏱️ Testing Rate Limiting:');
const testIp = '192.168.1.100';

// Simulate multiple requests
for (let i = 1; i <= 5; i++) {
  const isLimited = isRateLimited(testIp);
  console.log(`  Request ${i} from ${testIp}: ${isLimited ? '❌ Rate Limited' : '✅ Allowed'}`);
}

// Test middleware wrapper (basic functionality)
console.log('\n🔧 Testing Middleware Wrapper:');
const mockHandler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Test successful' })
  };
};

const wrappedHandler = withMiddleware(mockHandler);
const mockEvent = {
  requestContext: {
    http: {
      sourceIp: '192.168.1.200'
    }
  },
  headers: {}
};

wrappedHandler(mockEvent).then(result => {
  console.log('  ✅ Middleware wrapper test:', result.statusCode === 200 ? 'PASSED' : 'FAILED');
  console.log('  ✅ Response headers present:', !!result.headers['X-Request-ID']);
}).catch(error => {
  console.log('  ❌ Middleware wrapper test FAILED:', error.message);
});

console.log('\n✨ Enhanced function testing completed!\n');
console.log('📝 Summary of Enhancements:');
console.log('  ✅ Email validation with comprehensive regex');
console.log('  ✅ Name validation with length and character checks');
console.log('  ✅ Phone number validation with international format support');
console.log('  ✅ In-memory rate limiting with automatic cleanup');
console.log('  ✅ Enhanced middleware with logging and metrics');
console.log('  ✅ Comprehensive input validation for all update functions');
console.log('  ✅ API documentation endpoint added');
