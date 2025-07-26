const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb+srv://aj:ajtiwari@cryptowealth.nuzgigx.mongodb.net/cryptowealth';

async function checkUsers() {
  let client;
  try {
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(MONGO_URI);
    await client.connect();
    
    const db = client.db('cryptowealth');
    const users = db.collection('users');
    
    console.log('📊 Checking users in database...');
    
    // Count total users
    const userCount = await users.countDocuments();
    console.log(`👥 Total users: ${userCount}`);
    
    if (userCount > 0) {
      console.log('\n📋 User list:');
      const allUsers = await users.find({}).toArray();
      
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Created: ${user.createdAt || 'N/A'}`);
        console.log(`   Last Login: ${user.lastLogin || 'N/A'}`);
        console.log(`   Active: ${user.isActive || 'N/A'}`);
        console.log('   ---');
      });
    } else {
      console.log('❌ No users found in database');
    }
    
    // Check for specific user
    const specificUser = await users.findOne({ email: 'ajay261999tiwari@gmail.com' });
    if (specificUser) {
      console.log('✅ Found your user in database:');
      console.log(`   Email: ${specificUser.email}`);
      console.log(`   Name: ${specificUser.name}`);
      console.log(`   Created: ${specificUser.createdAt}`);
      console.log(`   Password hash exists: ${specificUser.password ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ Your email (ajay261999tiwari@gmail.com) not found in database');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔒 Database connection closed');
    }
  }
}

checkUsers();
