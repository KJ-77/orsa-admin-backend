const { getApiDocumentation } = require('./handler');

console.log('📖 Testing API Documentation Endpoint...\n');

const mockEvent = {
  requestContext: {
    http: {
      method: 'GET',
      path: '/api/docs'
    }
  },
  headers: {}
};

getApiDocumentation(mockEvent).then(result => {
  console.log('Status Code:', result.statusCode);
  
  if (result.statusCode === 200) {
    const apiDocs = JSON.parse(result.body);
    console.log('✅ API Documentation loaded successfully!');
    console.log('\n📋 Documentation Structure:');
    console.log(`  - Title: ${apiDocs.title}`);
    console.log(`  - Version: ${apiDocs.version}`);
    console.log(`  - Description: ${apiDocs.description.substring(0, 50)}...`);
    console.log(`  - Endpoints documented: ${Object.keys(apiDocs.endpoints).length} categories`);
    
    // Show endpoint categories
    Object.keys(apiDocs.endpoints).forEach(category => {
      const endpointCount = Object.keys(apiDocs.endpoints[category]).length;
      console.log(`    - ${category}: ${endpointCount} endpoints`);
    });
    
    console.log(`  - Security measures: ${apiDocs.security.length} items`);
    console.log(`  - Rate limiting: ${apiDocs.rateLimit.window}, ${apiDocs.rateLimit.maxRequests} requests`);
    console.log(`  - Examples provided: ${Object.keys(apiDocs.examples).length} endpoints`);
    
    console.log('\n🎉 API Documentation endpoint is working correctly!');
  } else {
    console.log('❌ API Documentation endpoint failed');
    console.log('Response:', result.body);
  }
}).catch(error => {
  console.log('❌ Error testing API documentation:', error.message);
});
