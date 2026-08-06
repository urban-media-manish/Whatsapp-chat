import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer = null;

export const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGODB_URI;

    if (!mongoUri || mongoUri.trim() === '') {
      console.log('⚡ No MONGODB_URI provided. Starting MongoMemoryServer in-memory database...');
      mongoMemoryServer = await MongoMemoryServer.create();
      mongoUri = mongoMemoryServer.getUri();
      console.log(`✅ MongoMemoryServer running at: ${mongoUri}`);
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`🚀 MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Try fallback to MongoMemoryServer if external connection fails
    try {
      console.log('⚡ Falling back to MongoMemoryServer...');
      mongoMemoryServer = await MongoMemoryServer.create();
      const mongoUri = mongoMemoryServer.getUri();
      const conn = await mongoose.connect(mongoUri);
      console.log(`✅ Fallback MongoMemoryServer Connected: ${conn.connection.host}`);
      return conn;
    } catch (fallbackErr) {
      console.error(`❌ Fallback MongoDB Connection Failed: ${fallbackErr.message}`);
      process.exit(1);
    }
  }
};
