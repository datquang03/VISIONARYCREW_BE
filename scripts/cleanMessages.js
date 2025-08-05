import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Clean messages collection
const cleanMessages = async () => {
  try {
    await connectDB();
    
    // Get current messages count
    const beforeCount = await mongoose.connection.db.collection('messages').countDocuments();
    console.log(`📊 Messages before cleanup: ${beforeCount}`);
    
    // Show sample of current messages to confirm structure
    const sampleMessages = await mongoose.connection.db
      .collection('messages')
      .find({})
      .limit(3)
      .toArray();
    
    console.log('📋 Sample messages before cleanup:');
    sampleMessages.forEach((msg, index) => {
      console.log(`Message ${index + 1}:`, {
        _id: msg._id,
        hasOldSchema: !!(msg.sender || msg.receiver),
        hasNewSchema: !!(msg.senderId || msg.receiverId),
        fields: Object.keys(msg)
      });
    });
    
    // Ask for confirmation
    console.log('\n⚠️  This will delete ALL messages from the collection!');
    console.log('🔄 Press Ctrl+C to cancel, or wait 5 seconds to proceed...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Delete all messages
    const result = await mongoose.connection.db.collection('messages').deleteMany({});
    console.log(`🗑️  Deleted ${result.deletedCount} messages`);
    
    // Verify cleanup
    const afterCount = await mongoose.connection.db.collection('messages').countDocuments();
    console.log(`📊 Messages after cleanup: ${afterCount}`);
    
    console.log('✅ Messages collection cleaned successfully!');
    console.log('🔄 Now test the schedule accept flow again to create new messages with correct schema');
    
  } catch (error) {
    console.error('❌ Error cleaning messages:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run cleanup
cleanMessages();