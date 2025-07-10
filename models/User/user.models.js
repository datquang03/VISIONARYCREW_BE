import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
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
    balance: {
      type: Number,
      default: 0,
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
    savedMedicalRecords: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MedicalRecord",
      },
    ],
}, {
  timestamps: true,
});
const User = mongoose.model("User", userSchema);
export default User;