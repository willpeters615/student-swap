// Simple script to create a test user
import fetch from 'node-fetch';

async function registerTestUser() {
  try {
    // Use the current domain from the browser, or fallback to localhost
    const baseUrl = 'http://0.0.0.0:5000';
    console.log('Attempting to register test user...');
    
    const userData = {
      username: 'testuser',
      email: 'testuser@university.edu',
      password: 'Password123!',
      university: 'Test University'
    };
    
    console.log('Using registration data:', userData);
    
    const response = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }
    
    console.log(`Response status: ${response.status}`);
    console.log('Response data:', responseData);
    
    if (response.ok) {
      console.log('✅ Test user created successfully!');
      return responseData;
    } else {
      console.error('❌ Failed to create test user');
    }
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  }
}

registerTestUser();