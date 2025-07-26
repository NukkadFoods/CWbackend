const axios = require('axios');

const testSignup = async () => {
  console.log('🧪 Testing signup with email verification...');
  
  const testUser = {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'TestPassword123!',
    phone: '+1234567890',
    country: 'United States',
    captchaToken: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI', // Test CAPTCHA token
    trackingInfo: {
      userAgent: 'Test Agent',
      platform: 'Test Platform',
      language: 'en-US',
      timezone: 'America/New_York',
      screenResolution: '1920x1080',
      timestamp: new Date().toISOString()
    },
    agreeToTerms: true,
    agreeToMarketing: false
  };

  try {
    const response = await axios.post('http://localhost:5000/api/auth/signup', testUser, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ Signup Response:', response.status, response.statusText);
    console.log('📧 Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('🎉 Signup successful!');
      console.log('📬 Email verification should be sent to:', testUser.email);
      console.log('✉️ Check the backend console for email sending logs');
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Signup failed:', error.response.status, error.response.statusText);
      console.error('📄 Error data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('❌ Network error:', error.message);
    }
  }
};

testSignup();
