
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

import { Server as SocketIOServer } from "socket.io";
import http from "http";
import { handleSocketConnection, setSocketIO } from './controllers/message.controllers.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080; // Use PORT from .env or fallback to 8080

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173', // Allow local frontend (adjust port if needed, e.g., 5173 for Vite)
    process.env.CLIENT_URL || 'https://visionarycrew-fe.vercel.app', // Allow frontend domain
    process.env.DOMAIN_BE || 'https://visionarycrew-be.vercel.app' // Allow backend domain
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Added PATCH
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Support cookies or auth headers if needed
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Serve static HTML from public/
app.use(express.static(path.join(__dirname, 'public')));

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

