import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  // Sender information
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'senderType'
  },
  senderType: {
    type: String,
    required: true,
    enum: ['User', 'Doctor'],
    default: 'User'
  },
  senderName: {
    type: String,
    required: true
  },
  senderAvatar: {
    type: String,
    default: null
  },

  // Receiver information
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'receiverType'
  },
  receiverType: {
    type: String,
    required: true,
    enum: ['User', 'Doctor'],
    default: 'Doctor'
  },
  receiverName: {
    type: String,
    required: true
  },
  receiverAvatar: {
    type: String,
    default: null
  },

  // Message content
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number
  }],

  // Message status
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },

  // Conversation tracking
  conversationId: {
    type: String,
    required: true,
    index: true
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ receiverId: 1, isRead: 1 });

// Virtual for conversation participants
messageSchema.virtual('participants', {
  ref: 'User',
  localField: 'senderId',
  foreignField: '_id',
  justOne: true
});

// Generate conversation ID
messageSchema.statics.generateConversationId = function(senderId, receiverId) {
  const sortedIds = [senderId.toString(), receiverId.toString()].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};

// Pre-save middleware to generate conversation ID if not exists
messageSchema.pre('save', function(next) {
  if (!this.conversationId) {
    this.conversationId = this.constructor.generateConversationId(this.senderId, this.receiverId);
  }
  next();
});

// Instance method to mark as read
messageSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to get unread count
messageSchema.statics.getUnreadCount = function(userId, userType) {
  return this.countDocuments({
    receiverId: userId,
    receiverType: userType,
    isRead: false,
    isDeleted: false
  });
};

// Static method to get conversations
messageSchema.statics.getConversations = function(userId, userType) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  
  return this.aggregate([
    {
      $match: {
        $or: [
          { senderId: userObjectId },
          { receiverId: userObjectId }
        ],
        isDeleted: false
      }
    },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $last: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiverId', userObjectId] },
                  { $eq: ['$isRead', false] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $sort: { 'lastMessage.createdAt': -1 }
    }
  ]);
};

const Message = mongoose.model('Message', messageSchema);

export default Message; 