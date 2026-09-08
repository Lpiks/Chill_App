require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const makeAdmin = async (email) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const result = await User.updateOne(
      { email: email.toLowerCase().trim() },
      { $set: { role: 'admin' } }
    );
    
    if (result.matchedCount === 0) {
      console.log('User not found');
    } else {
      console.log(`User ${email} is now an admin`);
    }
    
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const email = process.argv[2] || 'elhadi@cinedz.com';
makeAdmin(email);
