const { validateEmail, validateName, validatePhoneNumber } = require('./handler');

console.log('🧪 Testing Enhanced Functions for Orsa Admin Backend\n');

// Test email validation
console.log('📧 Testing Email Validation:');
const testEmails = [
  'valid@example.com',
  'test.email+tag@domain.co.uk', 
  'invalid-email',
  'user@',
  '@domain.com',
  ''
];

testEmails.forEach(email => {
  const isValid = validateEmail(email);
  console.log(`  ✓ "${email}" -> ${isValid ? '✅ Valid' : '❌ Invalid'}`);
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
  'Valid Name123'
];

testNames.forEach(name => {
  const isValid = validateName(name);
  console.log(`  ✓ "${name}" -> ${isValid ? '✅ Valid' : '❌ Invalid'}`);
});

// Test phone number validation
console.log('\n📱 Testing Phone Number Validation:');
const testPhones = [
  '+1234567890',
  '+33123456789',
  '1234567890',
  '+123',
  'not-a-phone',
  ''
];

testPhones.forEach(phone => {
  const isValid = validatePhoneNumber(phone);
  console.log(`  ✓ "${phone}" -> ${isValid ? '✅ Valid' : '❌ Invalid'}`);
});

console.log('\n✨ Enhanced function testing completed!\n');
