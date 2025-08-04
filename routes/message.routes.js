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

export default router; 