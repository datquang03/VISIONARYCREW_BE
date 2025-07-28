  import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    avatar: {
      type: String,
      trim: true,
      default: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    },
    description: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["doctor"],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifyToken: {
      type: String,
    },
    verifyTokenExpires: {
      type: Date,
    },
    resetPasswordCode: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    emailVerificationCode: {
      type: String,
    },
    emailVerificationExpires: {
      type: Date,
    },
    tempEmail: {
      type: String,
    },
    likedBlogs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Blog",
      },
    ],
    conversations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
    // Doctor-specific fields
    doctorType: {
      type: String,
      trim: true,
      default: null,
    },
    certifications: [
      {
        url: {
          type: String,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    doctorApplicationStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected", null],
      default: null,
    },
    rejectionMessage: {
      type: String,
      trim: true,
      default: null,
    },
    fullName: {
      type: String,
      trim: true,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    education: [
      {
        institution: {
          type: String,
          trim: true,
        },
        degree: {
          type: String,
          trim: true,
        },
        year: {
          type: Number,
        },
      },
    ],
    workExperience: [
      {
        workplace: {
          type: String,
          trim: true,
        },
        position: {
          type: String,
          trim: true,
        },
        startYear: {
          type: Number,
        },
        endYear: {
          type: Number,
          default: null,
        },
      },
    ],
    // Subscription package fields
    subscriptionPackage: {
      type: String,
      enum: ["free", "silver", "gold", "diamond"],
      default: "free",
    },
    subscriptionStartDate: {
      type: Date,
      default: null,
    },
    subscriptionEndDate: {
      type: Date,
      default: null,
    },
    scheduleLimits: {
      weekly: {
        type: Number,
        default: 0, // Free: 0, Silver: 5, Gold: 10, Diamond: 20
      },
      used: {
        type: Number,
        default: 0,
      },
      resetDate: {
        type: Date,
        default: null,
      },
    },
    isPriority: {
      type: Boolean,
      default: false, // Diamond members get priority in listing
    },
    balance: {
      type: Number,
      default: 0,
    },
    recentJob: {
      type: String,
      trim: true,
      default: null,
    },
  },
{
  timestamps: true,
}
);

const Doctor = mongoose.model("Doctor", doctorSchema);
export default Doctor;  