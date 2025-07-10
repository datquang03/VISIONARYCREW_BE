import bcrypt from "bcryptjs";
import User from "../models/User/user.models.js";
import { verifyEmail } from "../utils/sendEmail.js";
import { generateToken } from "../middlewares/auth.js";
import mongoose from "mongoose";

// Register a new user
export const register = async (req, res) => {
  try {
    const { username, email, phone, dateOfBirth, password } = req.body;

    // Validate required fields
    if (!username || !email || !phone || !dateOfBirth || !password) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập đầy đủ thông tin" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }, { username }],
    });
    if (existingUser) {
      return res.status(400).json({
        message: `Người dùng với ${
          existingUser.email === email
            ? "email"
            : existingUser.phone === phone
            ? "số điện thoại"
            : "tên đăng nhập"
        } đã tồn tại`,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      username,
      email,
      phone,
      dateOfBirth,
      password: hashedPassword,
      isVerified: false,
    });

    // Save user and send verification email
    await user.save();
    await verifyEmail(user);

    res
      .status(200)
      .json({ message: "Đăng kí thành công. Xin vui lòng kiểm tra email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify email with code
export const verifyEmailCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    // Find user by email and verification code
    const user = await User.findOne({ email, emailVerificationCode: code });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Xin vui lòng kiểm tra lại mã hoặc email" });
    }

    // Check if code is expired
    if (user.emailVerificationExpires < Date.now()) {
      return res.status(400).json({ message: "Mã đã hết hạn" });
    }

    // Mark user as verified
    user.isVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Xác minh email thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login user (with verification check)
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Không tìm thấy tên tài khoản người dùng" });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Vui lòng xác minh email trước khi đăng nhập" });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Sai mật khẩu" });
    }
    // Generate token
    const token = generateToken(user._id);
    res.status(200).json({
      message: "Đăng nhập thành công",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token,
        balance: user.balance,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get profile of the logged-in user
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // Kiểm tra ObjectId hợp lệ
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ." });
    }

    // Tìm người dùng
    const user = await User.findById(userId).select(
      " -password -isVerified -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail -tempEmailExpires"
    );
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại." });
    }

    res.status(200).json({
      message: "Lấy thông tin hồ sơ thành công.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        role: user.role,
        balance: user.balance,
        avatar: user.avatar,
        description: user.description,
        likedBlogs: user.likedBlogs,
        savedBlogs: user.savedBlogs,
        isVerified: user.isVerified,
        conversations: user.conversations,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// get user by id
export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    // Find user by ID
    const user = await User.findById(userId).select(
      "-password -isVerified -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail -tempEmailExpires -balance"
    );
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// get all users
export const getAllUsers = async (req, res) => {
  try {
    // count total users
    const totalUsers = await User.countDocuments();
    // Find all users
    const users = await User.find()
      .select(
        "-password -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail -tempEmailExpires"
      )
      .sort({ createdAt: -1 });
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "Không có người dùng nào" });
    }
    res.status(200).json({
      message: `Có tổng ${users.length} người dùng`,
      users,
      totalUsers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
