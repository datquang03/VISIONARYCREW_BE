import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: [true, "Doctor ID is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      validate: {
        validator: function(v) {
          // Allow past dates for accepted/completed schedules
          if (this.status === 'accepted' || this.status === 'completed') {
            return true;
          }
          // For other statuses, date cannot be in the past
          return v >= new Date().setHours(0, 0, 0, 0);
        },
        message: "Schedule date cannot be in the past"
      }
    },
    timeSlot: {
      startTime: {
        type: String,
        required: [true, "Start time is required"],
        validate: {
          validator: function(v) {
            // Validate time format (HH:mm)
            return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: "Start time must be in HH:mm format"
        }
      },
      endTime: {
        type: String,
        required: [true, "End time is required"],
        validate: {
          validator: function(v) {
            // Validate time format (HH:mm)
            return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: "End time must be in HH:mm format"
        }
      }
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["available", "pending", "booked", "accepted", "completed", "cancelled", "rejected"],
      default: "available",
    },
    appointmentType: {
      type: String,
      enum: ["online", "offline"],
      required: [true, "Appointment type is required"],
    },
    notes: {
      type: String,
      trim: true,
    },
    cancelReason: {
      type: String,
      trim: true,
      default: null,
    },
    rejectedReason: {
      type: String,
      trim: true,
      default: null,
    },
    meetingLink: {
      type: String,
      trim: true,
      default: null,
    }
  },
  {
    timestamps: true,
    versionKey: false // Disable the version key
  }
);

// Create index for efficient querying
scheduleSchema.index({ doctor: 1, date: 1 });
scheduleSchema.index({ date: 1, status: 1 });

const Schedule = mongoose.model("Schedule", scheduleSchema);
export default Schedule;
