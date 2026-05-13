import dotenv from 'dotenv';
dotenv.config();

import dns from 'dns';
// Force Google DNS for SRV resolution
dns.setServers(['8.8.8.8', '8.8.4.4']);

import http from 'http';
import mongoose from 'mongoose';
import { initSocket } from './socket.js';
import app from './app.js';

const PORT = process.env.PORT || 5001;

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log('✅ Connected to MongoDB Atlas Successfully');
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

connectDB();
