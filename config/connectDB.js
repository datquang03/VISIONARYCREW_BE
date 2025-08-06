import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000, // Tăng timeout
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      maxPoolSize: 50,
      connectTimeoutMS: 15000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // Không exit process trên Vercel
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
};

export default connectDB;
