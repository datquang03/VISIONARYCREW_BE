
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/connectDB.js';
import userRoutes from "./routes/user.routes.js";
import doctorRoutes from "./routes/doctor.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import scheduleRoutes from "./routes/schedule.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import aiGuideRoutes from "./routes/aiGuide.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
import messageRoutes from "./routes/message.routes.js";
import mongoose from 'mongoose';

import { Server as SocketIOServer } from "socket.io";
import http from "http";
import { handleSocketConnection, setSocketIO } from './controllers/message.controllers.js';

dotenv.config();

// Kiểm tra biến môi trường MongoDB URI
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI không được định nghĩa trong file .env');
  process.exit(1);
}

console.log('📝 Cấu hình MongoDB URI:', process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//<USERNAME>:<PASSWORD>@'));

// Kiểm tra trạng thái kết nối MongoDB
mongoose.connection.on('connected', () => {
  console.log('✅ Đã kết nối với MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Lỗi kết nối MongoDB:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('❌ Mất kết nối với MongoDB');
});

const app = express();
const port = process.env.PORT || 8080; // Use PORT from .env or fallback to 8080

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://visionarycrew-fe.vercel.app',
    'https://visionarycrew-fe-git-datquang-dat-quangs-projects.vercel.app',
    process.env.CLIENT_URL,
    process.env.DOMAIN_BE || 'https://visionarycrew-be-rpo7.vercel.app'
  ].filter(Boolean), // Remove any undefined values
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // Preflight results can be cached for 24 hours
};

// Middleware
app.use(cors(corsOptions));

// Add headers for all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});
app.use(express.json());

// Serve static HTML from public/
app.use(express.static(path.join(__dirname, 'public')));

// Khởi tạo kết nối MongoDB khi khởi động
let isConnected = false;

const initializeMongoDB = async () => {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (error) {
      console.error('❌ Lỗi khởi tạo MongoDB:', error);
      throw error;
    }
  }
  return isConnected;
};

// Middleware để đảm bảo kết nối MongoDB trước khi xử lý request
const ensureMongoDBConnection = async (req, res, next) => {
  try {
    await initializeMongoDB();
    next();
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB:', error);
    res.status(500).json({ error: 'Lỗi kết nối database' });
  }
};

// Thêm middleware vào tất cả các routes API
app.use('/api', ensureMongoDBConnection);

// Routes
app.use('/api/users', userRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiGuideRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/messages', messageRoutes);

// Default route (for "/")
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Debug route để kiểm tra environment variables
app.get('/debug/env', (req, res) => {
  res.json({
    mongodb_uri_exists: !!process.env.MONGODB_URI,
    mongodb_uri_length: process.env.MONGODB_URI?.length || 0,
    mongodb_uri_preview: process.env.MONGODB_URI?.substring(0, 30) + '...',
    node_env: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    client_url: process.env.CLIENT_URL,
    jwt_secret_exists: !!process.env.JWT_SECRET
  });
});

// Tạo HTTP server để dùng với socket.io
const server = http.createServer(app);
let io;
if (!process.env.VERCEL) {
  io = new SocketIOServer(server, {
    cors: {
      origin: [
        'http://localhost:5173',
        process.env.CLIENT_URL || 'https://visionarycrew-fe.vercel.app', // Allow frontend domain
        process.env.DOMAIN_BE || 'https://visionarycrew-be.vercel.app'
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      credentials: true
    }
  });

  // Set socket.io instance for message controller
  setSocketIO(io);

  // Lưu io vào global để controller có thể sử dụng
  global.io = io;

  io.on("connection", (socket) => {
    console.log('🔍 Debug: Socket connected:', socket.id);

    // Handle message socket events
    handleSocketConnection(socket);
    
    // Nhận userId khi client connect để join vào room riêng
    socket.on("join", (data) => {
      const { userId, userType } = data;
      if (userId) {
        console.log('🔍 Debug: User joining room:', userId, 'Type:', userType);
        socket.userId = userId;
        socket.userType = userType;
        socket.join(`user_${userId}`);
        console.log('🔍 Debug: User joined room successfully');
        
        // Confirm room join to client
        socket.emit('room_joined', { 
          userId, 
          userType, 
          room: `user_${userId}`,
          message: 'Successfully joined room'
        });
      }
    });

    socket.on("disconnect", () => {
      console.log('🔍 Debug: Socket disconnected:', socket.id);
    });
  });
}

// Thay app.listen bằng server.listen nếu không phải Vercel
const startServer = async () => {
  try {
    await connectDB();
    if (!process.env.VERCEL) {
      server.listen(port, () => {
        console.log(`🚀 Server running on port ${port}`);
        console.log(`📡 Socket.IO server ready for real-time messaging`);
      });
    }
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

// Only start the server if not running on Vercel
if (!process.env.VERCEL) {
  startServer();
}

// Export io để controller sử dụng
export { io };

// Export for Vercel serverless functions
export default app;

