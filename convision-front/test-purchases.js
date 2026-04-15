// Test script to verify purchases API communication
import axios from 'axios';

async function testPurchasesAPI() {
  try {
    // First, get a token
    const loginResponse = await axios.post('http://localhost:8000/api/v1/auth/login', {
      email: 'admin@convision.com',
      password: 'password'
    });
    
    const token = loginResponse.data.access_token;
    console.log('Token obtained:', token.substring(0, 50) + '...');
    
    // Now get purchases
    const purchasesResponse = await axios.get('http://localhost:8000/api/v1/purchases', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('Purchases response status:', purchasesResponse.status);
    console.log('Purchases data:', JSON.stringify(purchasesResponse.data.data[0], null, 2));
    
    // Check supplier data specifically
    const firstPurchase = purchasesResponse.data.data[0];
    console.log('Supplier data:', firstPurchase.supplier);
    console.log('Supplier name:', firstPurchase.supplier?.name);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testPurchasesAPI();
