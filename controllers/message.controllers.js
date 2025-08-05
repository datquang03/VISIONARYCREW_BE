import Message from '../models/message.models.js';
import User from '../models/User/user.models.js';
import Doctor from '../models/User/doctor.models.js';
import Schedule from '../models/Schedule/schedule.models.js';
import mongoose from 'mongoose';

// Socket.io instance (will be set from server.js)
let io = null;

// Set socket.io instance
export const setSocketIO = (socketIO) => {
  io = socketIO;
};

// Check if conversation is unlocked based on schedule approval
const isConversationUnlocked = async (userId, doctorId) => {
  try {
    // Check if there's an approved schedule between user and doctor
    const approvedSchedule = await Schedule.findOne({
      patient: userId,
      doctor: doctorId,
      status: 'accepted'
    });

    console.log('🔍 Debug isConversationUnlocked:', {
      userId,
      doctorId,
      foundSchedule: !!approvedSchedule,
      scheduleStatus: approvedSchedule?.status,
      scheduleId: approvedSchedule?._id
    });

    return !!approvedSchedule;
  } catch (error) {
    console.error('Error checking conversation unlock status:', error);
    return false;
  }
};

// Get conversation unlock status
export const getConversationUnlockStatus = async (req, res) => {
  try {
    const { userId, doctorId } = req.params;
    const currentUserId = req.user?._id || req.doctor?._id;

    console.log('🔍 Debug getConversationUnlockStatus:', {
      userId,
      doctorId,
      currentUserId,
      userType: req.user ? 'User' : req.doctor ? 'Doctor' : 'Unknown'
    });

    if (!currentUserId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const isUnlocked = await isConversationUnlocked(userId, doctorId);

    console.log('🔍 Debug unlock status result:', {
      userId,
      doctorId,
      isUnlocked
    });

    res.status(200).json({
      message: 'Unlock status retrieved successfully',
      data: {
        isUnlocked,
        userId,
        doctorId
      }
    });
  } catch (error) {
    console.error('Get conversation unlock status error:', error);
    res.status(500).json({ 
      message: 'Error checking unlock status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Send message with unlock validation
export const sendMessage = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const { receiverId, receiverType, content, messageType = 'text', attachments = [] } = req.body;
      const senderId = req.user?._id || req.doctor?._id;
      const senderType = req.user ? 'User' : 'Doctor';
      
      // Validate sender
      if (!senderId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Check if conversation is unlocked
      let isUnlocked = false;
      if (senderType === 'User') {
        // User sending to doctor - check if doctor approved schedule
        isUnlocked = await isConversationUnlocked(senderId, receiverId);
      } else {
        // Doctor sending to user - check if doctor approved schedule
        isUnlocked = await isConversationUnlocked(receiverId, senderId);
      }

      if (!isUnlocked) {
        return res.status(403).json({ 
          message: 'Conversation is locked. Schedule must be approved first.',
          error: 'CONVERSATION_LOCKED'
        });
      }

      // Get sender info
      let senderInfo;
      if (senderType === 'User') {
        senderInfo = await User.findById(senderId).select('username fullName avatar');
      } else {
        senderInfo = await Doctor.findById(senderId).select('username fullName avatar');
      }

      if (!senderInfo) {
        return res.status(404).json({ message: 'Sender not found' });
      }

      // Get receiver info
      let receiverInfo;
      if (receiverType === 'User') {
        receiverInfo = await User.findById(receiverId).select('username fullName avatar');
      } else {
        receiverInfo = await Doctor.findById(receiverId).select('username fullName avatar');
      }

      if (!receiverInfo) {
        return res.status(404).json({ message: 'Receiver not found' });
      }

      // Create message
      const message = new Message({
        senderId,
        senderType,
        senderName: senderInfo.fullName || senderInfo.username,
        senderAvatar: senderInfo.avatar,
        receiverId,
        receiverType,
        receiverName: receiverInfo.fullName || receiverInfo.username,
        receiverAvatar: receiverInfo.avatar,
        content,
        messageType,
        attachments
      });

      await message.save({ session });

      // Populate message for response
      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'username fullName avatar')
        .populate('receiverId', 'username fullName avatar');

      // Emit real-time message to receiver
      if (io) {
        io.to(`user_${receiverId}`).emit('new_message', {
          message: populatedMessage,
          conversationId: message.conversationId
        });

        // Emit typing indicator stop
        io.to(`user_${receiverId}`).emit('stop_typing', {
          senderId,
          conversationId: message.conversationId
        });
      }

      res.status(201).json({
        message: 'Message sent successfully',
        data: populatedMessage
      });
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      message: 'Error sending message',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    await session.endSession();
  }
};

// Get conversation messages
export const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user?._id || req.doctor?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate conversation access
    const conversation = await Message.findOne({
      conversationId,
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ],
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Get messages with pagination
    const skip = (page - 1) * limit;
    const messages = await Message.find({
      conversationId,
      isDeleted: false
    })
    .populate('senderId', 'username fullName avatar')
    .populate('receiverId', 'username fullName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId,
        receiverId: userId,
        isRead: false,
        isDeleted: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    // Emit read status to sender
    if (io) {
      const unreadMessages = messages.filter(msg => 
        msg.receiverId._id.toString() === userId.toString() && !msg.isRead
      );
      
      if (unreadMessages.length > 0) {
        io.to(`user_${unreadMessages[0].senderId._id}`).emit('messages_read', {
          conversationId,
          readerId: userId
        });
      }
    }

    const totalMessages = await Message.countDocuments({
      conversationId,
      isDeleted: false
    });

    res.status(200).json({
      message: 'Messages retrieved successfully',
      data: {
        messages: messages.reverse(), // Reverse to show oldest first
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalMessages / limit),
          totalMessages,
          hasNextPage: skip + messages.length < totalMessages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get conversation messages error:', error);
    res.status(500).json({ 
      message: 'Error retrieving messages',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get user conversations
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user?._id || req.doctor?._id;
    const userType = req.user ? 'User' : 'Doctor';

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const conversations = await Message.getConversations(userId, userType);
    
    console.log('🔍 getUserConversations result:', {
      userId: userId.toString(),
      userType,
      conversationsFound: conversations.length,
      hasMessages: conversations.length > 0
    });
    
    // Test: Get all messages for this user to debug
    const allMessages = await Message.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    }).sort({ createdAt: -1 }).limit(3);
    
    console.log('🔍 Recent messages for user:', {
      count: allMessages.length,
      messages: allMessages.map(msg => ({
        _id: msg._id,
        senderId: msg.senderId?.toString(),
        receiverId: msg.receiverId?.toString(),
        conversationId: msg.conversationId,
        content: msg.content?.substring(0, 50) + '...'
      }))
    });

    // Get additional info for each conversation
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = conv.lastMessage;
        const otherUserId = lastMessage.senderId.toString() === userId.toString() 
          ? lastMessage.receiverId 
          : lastMessage.senderId;
        const otherUserType = lastMessage.senderId.toString() === userId.toString() 
          ? lastMessage.receiverType 
          : lastMessage.senderType;

        // Get other user info
        let otherUserInfo;
        if (otherUserType === 'User') {
          otherUserInfo = await User.findById(otherUserId).select('username fullName avatar');
        } else {
          otherUserInfo = await Doctor.findById(otherUserId).select('username fullName avatar');
        }

        return {
          conversationId: conv._id,
          lastMessage: {
            ...lastMessage,
            senderName: lastMessage.senderName,
            receiverName: lastMessage.receiverName
          },
          unreadCount: conv.unreadCount,
          otherUser: {
            id: otherUserId,
            type: otherUserType,
            name: otherUserInfo?.fullName || otherUserInfo?.username,
            avatar: otherUserInfo?.avatar
          }
        };
      })
    );

    res.status(200).json({
      message: 'Conversations retrieved successfully',
      data: enrichedConversations
    });
  } catch (error) {
    console.error('Get user conversations error:', error);
    res.status(500).json({ 
      message: 'Error retrieving conversations',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?._id || req.doctor?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await Message.updateMany(
      {
        conversationId,
        receiverId: userId,
        isRead: false,
        isDeleted: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    // Emit read status to sender
    if (io && result.modifiedCount > 0) {
      const senderMessage = await Message.findOne({
        conversationId,
        receiverId: userId
      });

      if (senderMessage) {
        io.to(`user_${senderMessage.senderId}`).emit('messages_read', {
          conversationId,
          readerId: userId
        });
      }
    }

    res.status(200).json({
      message: 'Messages marked as read',
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({ 
      message: 'Error marking messages as read',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?._id || req.doctor?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const message = await Message.findOne({
      _id: messageId,
      senderId: userId,
      isDeleted: false
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found or unauthorized' });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    // Emit delete event to other participants
    if (io) {
      io.to(`user_${message.receiverId}`).emit('message_deleted', {
        messageId,
        conversationId: message.conversationId
      });
    }

    res.status(200).json({
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ 
      message: 'Error deleting message',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get unread count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?._id || req.doctor?._id;
    const userType = req.user ? 'User' : 'Doctor';

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const unreadCount = await Message.getUnreadCount(userId, userType);

    res.status(200).json({
      message: 'Unread count retrieved successfully',
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      message: 'Error retrieving unread count',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Search messages
export const searchMessages = async (req, res) => {
  try {
    const { query, conversationId } = req.query;
    const userId = req.user?._id || req.doctor?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const searchQuery = {
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ],
      content: { $regex: query, $options: 'i' },
      isDeleted: false
    };

    if (conversationId) {
      searchQuery.conversationId = conversationId;
    }

    const messages = await Message.find(searchQuery)
      .populate('senderId', 'username fullName avatar')
      .populate('receiverId', 'username fullName avatar')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      message: 'Search completed successfully',
      data: messages
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ 
      message: 'Error searching messages',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Socket event handlers
export const handleSocketConnection = (socket) => {
  const userId = socket.userId;
  const userType = socket.userType;

  if (!userId) {
    socket.disconnect();
    return;
  }

  // Join user's room
  socket.join(`user_${userId}`);

  console.log(`User ${userId} (${userType}) connected`);

  // Handle typing events
  socket.on('typing_start', (data) => {
    const { conversationId, receiverId } = data;
    socket.to(`user_${receiverId}`).emit('typing_start', {
      senderId: userId,
      conversationId
    });
  });

  socket.on('typing_stop', (data) => {
    const { conversationId, receiverId } = data;
    socket.to(`user_${receiverId}`).emit('typing_stop', {
      senderId: userId,
      conversationId
    });
  });

  // Handle message reactions
  socket.on('message_reaction', async (data) => {
    const { messageId, reaction } = data;
    
    try {
      const message = await Message.findById(messageId);
      if (message && (message.senderId.toString() === userId || message.receiverId.toString() === userId)) {
        // Add reaction logic here if needed
        socket.to(`user_${message.senderId}`).emit('message_reaction', {
          messageId,
          reaction,
          userId
        });
      }
    } catch (error) {
      console.error('Message reaction error:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User ${userId} disconnected`);
  });
}; 