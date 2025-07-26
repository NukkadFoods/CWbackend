const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://aj:ajtiwari@cryptowealth.nuzgigx.mongodb.net/cryptowealth';

async function fetchUsers() {
  const client = new MongoClient(uri);
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('cryptowealth');
    const usersCollection = db.collection('users');
    
    // Get all users
    const users = await usersCollection.find({}).toArray();
    
    console.log(`\n📊 Found ${users.length} users in database:\n`);
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
    } else {
      users.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  📧 Email: ${user.email}`);
        console.log(`  👤 Name: ${user.name || 'Not set'}`);
        console.log(`  📅 Created: ${user.createdAt || 'Not set'}`);
        console.log(`  🔐 Has Password: ${user.password ? 'Yes' : 'No'}`);
        console.log(`  🔑 User ID: ${user._id}`);
        console.log('  ─────────────────────────');
      });
    }
    
    // Check for your specific email
    const yourUser = await usersCollection.findOne({ 
      email: 'ajay261999tiwari@gmail.com' 
    });
    
    if (yourUser) {
      console.log('\n✅ Your user account found:');
      console.log(`  Email: ${yourUser.email}`);
      console.log(`  Name: ${yourUser.name}`);
      console.log(`  Created: ${yourUser.createdAt}`);
      console.log(`  Password hash length: ${yourUser.password ? yourUser.password.length + ' characters' : 'No password'}`);
    } else {
      console.log('\n❌ Your email (ajay261999tiwari@gmail.com) not found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔒 Database connection closed');
  }
}

fetchUsers();
