import mongoose from "mongoose";

const aiGuideSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userRole: {
      type: String,
      enum: ["user", "doctor", "admin"],
      required: true,
    },
    conversationHistory: [
      {
        role: {
          type: String,
          enum: ["user", "assistant"],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        context: {
          currentPage: String,
          userAction: String,
          systemState: String,
        },
      },
    ],
    currentContext: {
      currentPage: String,
      lastAction: String,
      userGoal: String,
      sessionStartTime: Date,
    },
    preferences: {
      language: {
        type: String,
        default: "vi",
      },
      guideLevel: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"],
        default: "beginner",
      },
      enableNotifications: {
        type: Boolean,
        default: true,
      },
    },
    statistics: {
      totalInteractions: {
        type: Number,
        default: 0,
      },
      sessionsCompleted: {
        type: Number,
        default: 0,
      },
      averageSessionDuration: {
        type: Number,
        default: 0,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
aiGuideSchema.index({ userId: 1, userRole: 1 });
aiGuideSchema.index({ "currentContext.sessionStartTime": 1 });

// Method to add conversation message
aiGuideSchema.methods.addMessage = function(role, content, context = {}) {
  this.conversationHistory.push({
    role,
    content,
    timestamp: new Date(),
    context,
  });
  this.statistics.totalInteractions += 1;
  return this.save();
};

// Method to update current context
aiGuideSchema.methods.updateContext = function(context) {
  this.currentContext = { ...this.currentContext, ...context };
  return this.save();
};

// Method to get recent conversation (last 10 messages)
aiGuideSchema.methods.getRecentConversation = function(limit = 10) {
  return this.conversationHistory
    .slice(-limit)
    .map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
    }));
};

const AIGuide = mongoose.model("AIGuide", aiGuideSchema);

export default AIGuide; 