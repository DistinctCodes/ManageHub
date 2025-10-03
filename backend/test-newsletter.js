const axios = require('axios');

const BASE_URL = 'http://localhost:6000';

async function testNewsletterEndpoint() {
  console.log('🚀 Testing Newsletter Subscription Endpoint\n');

  // Test 1: Valid email subscription
  console.log('Test 1: Valid email subscription');
  try {
    const response1 = await axios.post(`${BASE_URL}/newsletter/subscribe`, {
      email: 'test@example.com',
      name: 'Test User'
    });
    console.log('✅ Success:', JSON.stringify(response1.data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
  console.log('\n');

  // Test 2: Invalid email
  console.log('Test 2: Invalid email');
  try {
    const response2 = await axios.post(`${BASE_URL}/newsletter/subscribe`, {
      email: 'invalid-email',
      name: 'Invalid User'
    });
    console.log('✅ Unexpected success:', JSON.stringify(response2.data, null, 2));
  } catch (error) {
    console.log('❌ Expected validation error:', JSON.stringify(error.response?.data, null, 2));
  }
  console.log('\n');

  // Test 3: Missing email field
  console.log('Test 3: Missing email field');
  try {
    const response3 = await axios.post(`${BASE_URL}/newsletter/subscribe`, {
      name: 'No Email User'
    });
    console.log('✅ Unexpected success:', JSON.stringify(response3.data, null, 2));
  } catch (error) {
    console.log('❌ Expected validation error:', JSON.stringify(error.response?.data, null, 2));
  }
  console.log('\n');

  // Test 4: Email only (no name)
  console.log('Test 4: Email only (no name)');
  try {
    const response4 = await axios.post(`${BASE_URL}/newsletter/subscribe`, {
      email: 'emailonly@example.com'
    });
    console.log('✅ Success:', JSON.stringify(response4.data, null, 2));
  } catch (error) {
    console.log('❌ Error:', JSON.stringify(error.response?.data, null, 2));
  }

  console.log('\n🏁 Newsletter endpoint testing completed!');
}

testNewsletterEndpoint().catch(console.error);