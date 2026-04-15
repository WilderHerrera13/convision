// Test script to verify proxy communication
import axios from 'axios';

async function testProxy() {
  try {
    console.log('Testing proxy communication...');
    
    // Test the proxy endpoint
    const response = await axios.get('http://localhost:4300/api/v1/purchases', {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('Proxy response:', response.data);
    
  } catch (error) {
    console.log('Expected error (no auth):', error.response?.data);
  }
}

testProxy();
