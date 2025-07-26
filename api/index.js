const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://cwfrontend.vercel.app', 'https://cryptowealth.vercel.app'],
  credentials: true
}));
app.use(express.json());

// Configuration from environment variables
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://aj:ajtiwari@cryptowealth.nuzgigx.mongodb.net/cryptowealth';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const EMAIL_USER = process.env.EMAIL_USER || 'cryptoWealthauth@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'meccbhdlhgmvvmbs';
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';

// Email configuration
const emailTransporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

// In-memory storage for verification tokens (use Redis in production)
const verificationTokens = new Map();

// MongoDB connection
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db('cryptowealth');
    cachedDb = db;
    console.log('✅ Connected to MongoDB Atlas');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

// Advanced CAPTCHA verification
const verifyCaptcha = async (captchaToken) => {
  if (!captchaToken) return false;
  
  // Test CAPTCHA token for development
  if (captchaToken === '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI') {
    return true;
  }
  
  try {
    const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', 
      `secret=${RECAPTCHA_SECRET}&response=${captchaToken}`, 
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data.success;
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return false;
  }
};

// Generate verification token
const generateVerificationToken = (email) => {
  const token = uuidv4();
  const expiryTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  
  verificationTokens.set(token, {
    email: email.toLowerCase(),
    expires: expiryTime,
    used: false
  });
  
  return token;
};

// Advanced email verification with beautiful template
const sendVerificationEmail = async (email, firstName, verificationToken) => {
  const verificationUrl = `https://cwfrontend.vercel.app/verify-email?token=${verificationToken}`;
  
  const mailOptions = {
    from: EMAIL_USER,
    to: email,
    subject: '🚀 Verify Your CryptoWealth Account - Start Earning Today!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1a1a2e; color: #fff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #16213e, #0f172a); border-radius: 15px; padding: 40px; border: 2px solid #7c3aed; box-shadow: 0 20px 40px rgba(124, 58, 237, 0.3); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 32px; font-weight: bold; color: #8b5cf6; margin-bottom: 10px; }
          .title { font-size: 28px; font-weight: bold; margin-bottom: 20px; color: #fff; background: linear-gradient(135deg, #8b5cf6, #06d6a0); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .content { line-height: 1.8; margin-bottom: 30px; font-size: 16px; }
          .button { display: inline-block; padding: 18px 35px; background: linear-gradient(135deg, #8b5cf6, #06d6a0); color: white; text-decoration: none; border-radius: 12px; font-weight: bold; margin: 25px 0; font-size: 18px; transition: transform 0.3s ease; box-shadow: 0 10px 25px rgba(124, 58, 237, 0.4); }
          .features { background-color: #1e293b; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #06d6a0; }
          .feature-item { display: flex; align-items: center; margin: 12px 0; font-size: 15px; }
          .feature-icon { margin-right: 12px; font-size: 18px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #374151; color: #9ca3af; font-size: 14px; }
          .warning { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #92400e; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #f59e0b; }
          .stats { display: flex; justify-content: space-around; margin: 25px 0; }
          .stat { text-align: center; }
          .stat-number { font-size: 24px; font-weight: bold; color: #06d6a0; }
          .stat-label { font-size: 12px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🚀 CryptoWealth</div>
            <h1 class="title">Welcome to the Future of Crypto Earning!</h1>
          </div>
          
          <div class="content">
            <p>Hi ${firstName},</p>
            
            <p>🎉 <strong>Congratulations!</strong> You've just taken the first step towards financial freedom with CryptoWealth!</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">✅ Verify My Email & Start Earning</a>
            </div>
            
            <div class="stats">
              <div class="stat"><div class="stat-number">$48K+</div><div class="stat-label">Paid Yesterday</div></div>
              <div class="stat"><div class="stat-number">12,548</div><div class="stat-label">Active Investors</div></div>
              <div class="stat"><div class="stat-number">98%</div><div class="stat-label">Success Rate</div></div>
            </div>
            
            <div class="features">
              <h3 style="color: #06d6a0; margin-top: 0;">🚀 What you get after verification:</h3>
              <div class="feature-item"><span class="feature-icon">💰</span><span><strong>2% Hourly ROI</strong> - Earn every hour, 24/7</span></div>
              <div class="feature-item"><span class="feature-icon">🔒</span><span><strong>Secure Dashboard</strong> - Bank-grade security</span></div>
              <div class="feature-item"><span class="feature-icon">⚡</span><span><strong>Instant Deposits</strong> - Start earning immediately</span></div>
              <div class="feature-item"><span class="feature-icon">💸</span><span><strong>Fast Withdrawals</strong> - Get your profits in 24hrs</span></div>
              <div class="feature-item"><span class="feature-icon">👥</span><span><strong>Referral Bonuses</strong> - Earn 10% from referrals</span></div>
            </div>
            
            <div class="warning">
              <strong>⏰ Time Sensitive!</strong> This verification link expires in 24 hours. Verify now to secure your spot!
            </div>
            
            <p style="font-size: 18px; font-weight: bold; color: #06d6a0;">Ready to start your crypto earning journey? 🚀</p>
            
            <p><strong>The CryptoWealth Team</strong> 💎</p>
          </div>
          
          <div class="footer">
            <p>This email was sent to ${email}</p>
            <p><strong>CryptoWealth</strong> - Your Gateway to Crypto Wealth</p>
            <p>© 2025 CryptoWealth. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    console.log('✅ Advanced verification email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('❌ Email sending error:', error);
    return false;
  }
};

// Verify email token
const verifyEmailToken = (token) => {
  const tokenData = verificationTokens.get(token);
  
  if (!tokenData) {
    return { success: false, message: 'Invalid verification token' };
  }
  
  if (tokenData.used) {
    return { success: false, message: 'Verification token has already been used' };
  }
  
  if (Date.now() > tokenData.expires) {
    verificationTokens.delete(token);
    return { success: false, message: 'Verification token has expired' };
  }
  
  return { success: true, email: tokenData.email };
};

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CryptoWealth Backend API v2.0 - Serverless',
    status: 'Running',
    timestamp: new Date().toISOString(),
    features: [
      '🔒 Advanced CAPTCHA Protection',
      '📧 Beautiful Email Verification',
      '🚀 Modern User Registration',
      '💎 Premium Email Templates',
      '⚡ Serverless Architecture'
    ],
    endpoints: {
      health: 'GET /api/health',
      login: 'POST /api/auth/login',
      register: 'POST /api/auth/register',
      verifyEmail: 'POST /api/auth/verify-email',
      resendVerification: 'POST /api/auth/resend-verification',
      verifyToken: 'POST /api/auth/verify-token'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: 'Vercel Serverless'
  });
});

// API root
app.get('/api', (req, res) => {
  res.json({
    message: 'CryptoWealth API v2.0 - Advanced Email Verification (Serverless)',
    status: 'Active',
    features: [
      'Advanced CAPTCHA Protection',
      'Beautiful Email Templates', 
      'Token-based Email Verification',
      'Comprehensive User Profiles',
      'Security Tracking',
      'Serverless Functions'
    ],
    endpoints: [
      '/api/auth/login',
      '/api/auth/register', 
      '/api/auth/verify-email',
      '/api/auth/resend-verification',
      '/api/auth/verify-token',
      '/api/health'
    ]
  });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const db = await connectToDatabase();
    console.log('🔐 Login attempt received');
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const users = db.collection('users');
    
    // Find existing user
    let user = await users.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Create new user if doesn't exist
      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: email.split('@')[0],
        createdAt: new Date(),
        lastLogin: new Date(),
        isActive: true
      };
      
      const result = await users.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
      
    } else {
      // Verify existing user password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }
      
      // Update last login
      await users.updateOne(
        { _id: user._id },
        { $set: { lastLogin: new Date() } }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return success response
    const { password: _, ...userResponse } = user;
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Register endpoint with advanced email verification
app.post('/api/auth/register', async (req, res) => {
  try {
    const db = await connectToDatabase();
    console.log('🚀 Advanced registration attempt:', req.body.email);
    
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      country, 
      agreeToTerms, 
      agreeToMarketing,
      captchaToken,
      trackingInfo
    } = req.body;

    // Comprehensive validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, first name, and last name are required'
      });
    }

    if (!agreeToTerms) {
      return res.status(400).json({
        success: false,
        message: 'You must agree to the terms of service'
      });
    }

    // Advanced CAPTCHA verification
    const captchaValid = await verifyCaptcha(captchaToken);
    if (!captchaValid) {
      return res.status(400).json({
        success: false,
        message: 'CAPTCHA verification failed. Please try again.'
      });
    }

    const users = db.collection('users');
    
    // Check if user exists
    const existingUser = await users.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Generate verification token
    const verificationToken = generateVerificationToken(email);

    // Create advanced user profile
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = {
      id: uuidv4(),
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      phone: phone || '',
      country: country || '',
      agreeToTerms,
      agreeToMarketing: agreeToMarketing || false,
      emailVerified: false,
      status: 'pending_verification',
      verificationToken,
      createdAt: new Date(),
      lastLogin: null,
      isActive: false,
      profile: {
        totalInvestment: 0,
        totalEarnings: 0,
        referralCount: 0,
        accountTier: 'bronze'
      },
      security: {
        loginAttempts: 0,
        accountLocked: false,
        twoFactorEnabled: false
      },
      trackingInfo: trackingInfo || {},
      settings: {
        emailNotifications: true,
        smsNotifications: false,
        marketingEmails: agreeToMarketing || false
      }
    };
    
    const result = await users.insertOne(newUser);
    
    // Send advanced verification email
    console.log('📧 Sending advanced verification email...');
    const emailSent = await sendVerificationEmail(email, firstName, verificationToken);
    
    if (emailSent) {
      console.log('✅ Advanced registration completed successfully');
      res.status(201).json({
        success: true,
        message: 'Account created successfully! 🎉 Please check your email to verify your account and start earning with CryptoWealth.',
        data: {
          email,
          firstName,
          fullName: `${firstName} ${lastName}`,
          verificationSent: true,
          accountStatus: 'pending_verification',
          nextStep: 'Please check your email and click the verification link to activate your account.'
        }
      });
    } else {
      console.log('⚠️ Registration completed but email failed');
      res.status(201).json({
        success: true,
        message: 'Account created successfully! However, we could not send the verification email. Please contact our support team.',
        data: {
          email,
          firstName,
          fullName: `${firstName} ${lastName}`,
          verificationSent: false,
          accountStatus: 'pending_verification',
          supportAction: 'required'
        }
      });
    }

  } catch (error) {
    console.error('❌ Advanced registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// Advanced Email Verification Endpoint
app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Verify the token
    const tokenVerification = verifyEmailToken(token);
    
    if (!tokenVerification.success) {
      return res.status(400).json({
        success: false,
        message: tokenVerification.message
      });
    }

    const users = db.collection('users');
    
    // Find and update user
    const user = await users.findOne({ email: tokenVerification.email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Update user as verified
    await users.updateOne(
      { email: tokenVerification.email },
      { 
        $set: { 
          emailVerified: true,
          status: 'active',
          isActive: true,
          verifiedAt: new Date()
        },
        $unset: {
          verificationToken: ""
        }
      }
    );

    // Mark token as used
    const tokenData = verificationTokens.get(token);
    if (tokenData) {
      tokenData.used = true;
      verificationTokens.set(token, tokenData);
    }

    console.log('✅ Email verified successfully for:', tokenVerification.email);

    res.json({
      success: true,
      message: '🎉 Email verified successfully! Your CryptoWealth account is now active. You can now log in and start earning!',
      data: {
        email: tokenVerification.email,
        status: 'verified',
        accountActive: true,
        nextStep: 'Login to access your dashboard and start investing'
      }
    });

  } catch (error) {
    console.error('❌ Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during verification'
    });
  }
});

// Resend Verification Email Endpoint
app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const users = db.collection('users');
    const user = await users.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const newVerificationToken = generateVerificationToken(email);
    
    // Update user with new token
    await users.updateOne(
      { email: email.toLowerCase() },
      { $set: { verificationToken: newVerificationToken } }
    );

    // Send new verification email
    const emailSent = await sendVerificationEmail(email, user.firstName, newVerificationToken);
    
    if (emailSent) {
      res.json({
        success: true,
        message: 'Verification email sent successfully! Please check your inbox.',
        data: {
          email,
          verificationSent: true
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again later.'
      });
    }

  } catch (error) {
    console.error('❌ Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify token middleware
app.post('/api/auth/verify-token', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const users = db.collection('users');
    
    const user = await users.findOne({ _id: new ObjectId(decoded.userId) });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    const { password: _, ...userResponse } = user;
    
    res.json({
      success: true,
      user: userResponse
    });

  } catch (error) {
    console.error('❌ Token verification error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Export the Express app for Vercel
module.exports = app;
