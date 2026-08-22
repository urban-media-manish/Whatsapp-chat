import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import authRoutes, { seedInitialUsers } from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import { setupSocket } from './socket/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Enable gzip/deflate compression for fast transfers
app.use(compression());

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline styles & media serving
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Attach Socket.IO instance to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', apiLimiter);

// Serve static uploads
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/settings', settingRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'Enterprise Live Customer Support Platform',
    timestamp: new Date().toISOString()
  });
});

// Serve Frontend Client Static Build (for production / fullstack hosting)
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

// Initialize Socket.IO handlers
setupSocket(io);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await seedInitialUsers();

  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Live Support Server running on http://localhost:${PORT}`);
    console.log(`💬 Socket.IO Realtime Gateway active`);
    console.log(`======================================================\n`);
  });
};

startServer();
