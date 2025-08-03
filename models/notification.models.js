import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "schedule_register",
        "schedule_cancel", 
        "schedule_reject",
        "schedule_accept",
        "schedule_completed",
        "feedback_received",
        "booking",
        "cancel",
        // Có thể mở rộng thêm các loại khác
      ],
    },
    message: {
      type: String,
      required: true,
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
    },
    cancelReason: {
      type: String,
    },
    data: {
      type: Object,
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification; 