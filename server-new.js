const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Initialize Express app
const app = express();
const PORT = 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// MongoDB configuration
const MONGO_URI = 'mongodb+srv://aj:ajtiwari@cryptowealth.nuzgigx.mongodb.net/cryptowealth';
const JWT_SECRET = 'your-secret-key-here';

let db;

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db('cryptowealth');
    console.log('✅ Connected to MongoDB Atlas');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CryptoWealth Backend API',
    status: 'Running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /api/health',
      login: 'POST /api/auth/login',
      register: 'POST /api/auth/register'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API root
app.get('/api', (req, res) => {
  res.json({
    message: 'CryptoWealth API v1.0',
    status: 'Active',
    endpoints: ['/api/auth/login', '/api/auth/register', '/api/health']
  });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', req.body.email);
    
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
      console.log('👤 Creating new user:', email);
      
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
        console.log('❌ Invalid password for:', email);
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
    
    console.log('✅ Login successful:', email);
    
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

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const users = db.collection('users');
    
    // Check if user exists
    const existingUser = await users.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = {
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || email.split('@')[0],
      createdAt: new Date(),
      lastLogin: new Date(),
      isActive: true
    };
    
    const result = await users.insertOne(newUser);
    
    // Generate token
    const token = jwt.sign(
      {
        userId: result.insertedId.toString(),
        email: newUser.email
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...userResponse } = newUser;
    userResponse._id = result.insertedId;
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Verify token middleware
app.post('/api/auth/verify', async (req, res) => {
  try {
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

// Start server
async function startServer() {
  try {
    // Connect to MongoDB first
    await connectToMongoDB();
    
    // Start the server
    app.listen(PORT, () => {
      console.log('🚀 CryptoWealth Backend Server Started');
      console.log(`📡 Server running on: http://localhost:${PORT}`);
      console.log(`🔗 API available at: http://localhost:${PORT}/api`);
      console.log(`💾 MongoDB: Connected to Atlas`);
      console.log('✅ Backend ready for requests');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();
