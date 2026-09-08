require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('ADMIN_EMAIL or ADMIN_PASSWORD missing in .env');
      process.exit(1);
    }

    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });

    if (existingAdmin) {
      console.log(`User ${adminEmail} already exists. Ensuring admin role...`);
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log('Admin role confirmed.');
    } else {
      console.log(`Creating new admin user: ${adminEmail}`);
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      const newAdmin = new User({
        name: 'Elhadi Admin',
        email: adminEmail.toLowerCase(),
        password: hashedPassword,
        role: 'admin',
        isVerified: true
      });
      
      await newAdmin.save();
      console.log('Admin user created successfully.');
    }

    await mongoose.connection.close();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Error seeding admin:', err);
    process.exit(1);
  }
};

seedAdmin();
