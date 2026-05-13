import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import bcrypt from 'bcrypt';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    const adminEmail = 'admin@rahasya.com';
    const adminPassword = 'AdminPassword123!';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin already exists. Updating to Super Admin status...');
      existingAdmin.role = 'Super Admin';
      existingAdmin.status = 'ACTIVE';
      await existingAdmin.save();
    } else {
      console.log('Creating initial Super Admin...');
      await User.create({
        name: 'Super Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'Super Admin',
        status: 'ACTIVE',
        department: 'Management'
      });
    }

    console.log('✅ Admin account ready!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('IMPORTANT: Please change this password after your first login.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
