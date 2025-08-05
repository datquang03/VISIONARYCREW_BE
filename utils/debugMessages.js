import mongoose from 'mongoose';
import Message from '../models/message.models.js';

// Debug utility to check message collections and data
export const debugMessageCollections = async () => {
  try {
    console.log('🔍 Debug: Checking message collections...');
    
    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📊 All collections:', collections.map(c => c.name));
    
    // Check messages collection specifically
    const messagesExists = collections.find(c => c.name === 'messages');
    console.log('📋 Messages collection exists:', !!messagesExists);
    
    if (messagesExists) {
      // Get sample data from messages collection
      const sampleMessages = await mongoose.connection.db
        .collection('messages')
        .find({})
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();
      
      console.log('📝 Sample messages from collection:', JSON.stringify(sampleMessages, null, 2));
      
      // Compare with our Message model
      const modelMessages = await Message.find({}).sort({ createdAt: -1 }).limit(3);
      console.log('🏗️ Messages from Model:', JSON.stringify(modelMessages, null, 2));
    }
    
    // Check for alternative collections that might contain messages
    const messageRelatedCollections = collections.filter(c => 
      c.name.toLowerCase().includes('message') || 
      c.name.toLowerCase().includes('chat') ||
      c.name.toLowerCase().includes('conversation')
    );
    
    console.log('💬 Message-related collections:', messageRelatedCollections.map(c => c.name));
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
};

// Check if the message you showed exists
export const findSpecificMessage = async (messageId) => {
  try {
    console.log('🔍 Looking for message:', messageId);
    
    // Try direct collection access
    const directMessage = await mongoose.connection.db
      .collection('messages')
      .findOne({ _id: new mongoose.Types.ObjectId(messageId) });
    
    console.log('📝 Direct collection result:', JSON.stringify(directMessage, null, 2));
    
    // Try model access
    const modelMessage = await Message.findById(messageId);
    console.log('🏗️ Model result:', JSON.stringify(modelMessage, null, 2));
    
  } catch (error) {
    console.error('❌ Error finding message:', error);
  }
};