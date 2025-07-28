import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'senderModel'
    },
    senderModel: {
      type: String,
      required: true,
      enum: ['User', 'Doctor']
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'receiverModel'
    },
    receiverModel: {
      type: String,
      required: true,
      enum: ['User', 'Doctor']
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file'],
      default: 'text'
    },
    fileUrl: {
      type: String,
      trim: true
    },
    fileName: {
      type: String,
      trim: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date
    },
    // Emote/Reaction field
    emotes: {
      type: Map,
      of: [{
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        userType: {
          type: String,
          enum: ['User', 'Doctor'],
          required: true
        },
        emote: {
          type: String,
          required: true,
          enum: ['❤️', '👍', '👎', '😂', '😮', '😢', '😡', '🎉', '👏', '🙏']
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }],
      default: new Map()
    }
  },
  {
    timestamps: true
  }
);

// Index để tối ưu query
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, isRead: 1 });

const Message = mongoose.model("Message", messageSchema);
export default Message; 