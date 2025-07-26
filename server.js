
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
import { Server as SocketIOServer } from "socket.io";
import http from "http";

dotenv.config();

const app = express();
const port = process.env.PORT || 8080; // Use PORT from .env or fallback to 8080

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173', // Allow local frontend (adjust port if needed, e.g., 5173 for Vite)
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

// Default route (for "/")
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Tạo HTTP server để dùng với socket.io
const server = http.createServer(app);
let io;
if (!process.env.VERCEL) {
  io = new SocketIOServer(server, {
    cors: {
      origin: [
        'http://localhost:5173',
        process.env.DOMAIN_BE || 'https://visionarycrew-be.vercel.app'
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    // Nhận userId khi client connect để join vào room riêng
    socket.on("join", (userId) => {
      if (userId) socket.join(userId);
    });
    // Có thể mở rộng thêm các event khác
  });
}

// Thay app.listen bằng server.listen nếu không phải Vercel
const startServer = async () => {
  try {
    await connectDB();
    if (!process.env.VERCEL) {
      server.listen(port, () => {
        // Server started successfully
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
