import express from 'express';
import {
  sendMessage,
  getConversationMessages,
  getUserConversations,
  markMessagesAsRead,
  deleteMessage,
  getUnreadCount,
  searchMessages,
  getConversationUnlockStatus
} from '../controllers/message.controllers.js';
import { protectRouter, protectDoctorRouter } from '../middlewares/auth.js';

const router = express.Router();

// Protected routes (require authentication)
router.post('/send', protectRouter, sendMessage);
router.get('/conversations', protectRouter, getUserConversations);
router.get('/conversation/:conversationId', protectRouter, getConversationMessages);
router.put('/conversation/:conversationId/read', protectRouter, markMessagesAsRead);
router.delete('/message/:messageId', protectRouter, deleteMessage);
router.get('/unread-count', protectRouter, getUnreadCount);
router.get('/search', protectRouter, searchMessages);
router.get('/unlock-status/:userId/:doctorId', protectRouter, getConversationUnlockStatus);

// Doctor specific routes (if needed)
router.post('/doctor/send', protectDoctorRouter, sendMessage);
router.get('/doctor/conversations', protectDoctorRouter, getUserConversations);
router.get('/doctor/conversation/:conversationId', protectDoctorRouter, getConversationMessages);
router.put('/doctor/conversation/:conversationId/read', protectDoctorRouter, markMessagesAsRead);
router.delete('/doctor/message/:messageId', protectDoctorRouter, deleteMessage);
router.get('/doctor/unread-count', protectDoctorRouter, getUnreadCount);
router.get('/doctor/search', protectDoctorRouter, searchMessages);
router.get('/doctor/unlock-status/:userId/:doctorId', protectDoctorRouter, getConversationUnlockStatus);

// Import debug utilities
import { debugMessageCollections, findSpecificMessage } from '../utils/debugMessages.js';

// Debug route to check collections
router.get('/debug/collections', protectRouter, async (req, res) => {
  try {
    await debugMessageCollections();
    res.json({ message: 'Debug completed, check server logs' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug route to find specific message
router.get('/debug/message/:messageId', protectRouter, async (req, res) => {
  try {
    const { messageId } = req.params;
    await findSpecificMessage(messageId);
    res.json({ message: 'Debug completed, check server logs' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug route to check all messages
router.get('/debug/all', protectRouter, async (req, res) => {
  try {
    const Message = (await import('../models/message.models.js')).default;
    const userId = req.user?._id || req.doctor?._id;
    
    const allMessages = await Message.find({}).sort({ createdAt: -1 }).limit(10);
    const userMessages = await Message.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    }).sort({ createdAt: -1 }).limit(5);
    
    res.json({
      allMessages: allMessages.map(msg => ({
        _id: msg._id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content?.substring(0, 50) + '...',
        conversationId: msg.conversationId,
        createdAt: msg.createdAt
      })),
      userMessages: userMessages.map(msg => ({
        _id: msg._id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content?.substring(0, 50) + '...',
        conversationId: msg.conversationId,
        createdAt: msg.createdAt
      })),
      userId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 