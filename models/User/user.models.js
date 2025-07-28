import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
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
      enum: ["user", "admin"],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      // Added for soft delete
      type: Boolean,
      default: false,
    },
    balance: {
      // Added for user balance
      type: Number,
      default: 0,
      min: 0,
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
    tempEmailExpires: {
      // Added to match exclusion in getMyProfile
      type: Date,
    },
    likedBlogs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Blog",
      },
    ],
    savedBlogs: [
      {
        // Added to match getMyProfile
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
    savedMedicalRecords: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MedicalRecord",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Ensure queries exclude deleted users by default
userSchema.pre(/^find/, function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

const User = mongoose.model("User", userSchema);
export default User;