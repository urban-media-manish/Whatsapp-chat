import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { initDb, getDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = 'whatsapp_realtime_secret_key_2026';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const activeSockets = new Map();

/* --- REST API ROUTES --- */

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const db = getDb();
    const { username, password, name, phone, avatar, about } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Username, password and name are required' });
    }

    const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username.toLowerCase().trim()]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userAvatar = avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80`;
    const userPhone = phone || `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`;

    const result = await db.run(
      'INSERT INTO users (username, password, name, phone, avatar, about) VALUES (?, ?, ?, ?, ?, ?)',
      [username.toLowerCase().trim(), hashedPassword, name.trim(), userPhone, userAvatar, about || 'Available | Using WhatsApp']
    );

    const user = await db.get('SELECT id, username, name, phone, avatar, about, role, status FROM users WHERE id = ?', [result.lastID]);

    // Auto-create chat with Support ✓ agent and send initial welcome template card
    const supportUser = await db.get("SELECT id FROM users WHERE username = 'support'");
    if (supportUser && user.id !== supportUser.id) {
      const u1 = Math.min(user.id, supportUser.id);
      const u2 = Math.max(user.id, supportUser.id);

      const chatRes = await db.run(
        'INSERT INTO chats (user1_id, user2_id, last_message, last_message_time) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [u1, u2, '🤝 BETBOSS99 | TRUSTED & SECURE 🤝']
      );
      const chatId = chatRes.lastID;

      // Welcome Card Template
      const templatePayload = JSON.stringify({
        title: "🤝 BETBOSS99 | TRUSTED & SECURE 🤝",
        subtitle: "100% Safe Platform",
        officialUrl: "www.betboss99.com",
        guideUrl: "https://vimeo.com/1109852737",
        points: "1 Pt = ₹1 | Min ID ₹100 | Min Bet ₹100\n(Demo ID: \"Login With Demo\")",
        verifiedNotice: "⚡ VERIFIED SITES (AUTO DEPOSIT & WITHDRAWAL)",
        verifiedSites: ["betboss99.com", "reallotus365.ink"],
        footer: "💎 24/7 Live Customer Support | Kheliye Bina Kisi Darr Ke! 💎"
      });

      const optionsPayload = JSON.stringify({
        prompt: "Please select one site",
        hint: "Tap any number below to continue",
        buttons: ["1️⃣ Welcome To Real Lotus365"]
      });

      const now = new Date().toISOString();
      await db.run(
        `INSERT INTO messages (chat_id, sender_id, recipient_id, text, type, template_data, status, timestamp) 
         VALUES (?, ?, ?, ?, 'template', ?, 'read', ?)`,
        [chatId, supportUser.id, user.id, '🤝 BETBOSS99 | TRUSTED & SECURE 🤝', templatePayload, now]
      );

      await db.run(
        `INSERT INTO messages (chat_id, sender_id, recipient_id, text, type, options_data, status, timestamp) 
         VALUES (?, ?, ?, ?, 'options', ?, 'read', ?)`,
        [chatId, supportUser.id, user.id, 'Please select one site', optionsPayload, now]
      );
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const db = getDb();
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await db.get('SELECT * FROM users WHERE username = ?', [username.toLowerCase().trim()]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password).catch(() => user.password === password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Me Profile
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const db = getDb();
    const user = await db.get('SELECT id, username, name, phone, avatar, about, role, status FROM users WHERE id = ?', [decoded.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Search Users
app.get('/api/users/search', async (req, res) => {
  try {
    const db = getDb();
    const query = req.query.q || '';
    const currentUserId = req.query.userId;

    const users = await db.all(
      `SELECT id, username, name, phone, avatar, about, status, last_seen 
       FROM users 
       WHERE (username LIKE ? OR name LIKE ? OR phone LIKE ?) AND id != ? 
       LIMIT 20`,
      [`%${query}%`, `%${query}%`, `%${query}%`, currentUserId || 0]
    );

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Error searching users' });
  }
});

// Get Chats
app.get('/api/chats', async (req, res) => {
  try {
    const db = getDb();
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId parameter is required' });

    const chats = await db.all(
      `SELECT 
        c.id as chatId,
        u.id as contactId,
        u.name,
        u.username,
        u.phone,
        u.avatar,
        u.about,
        u.status as userStatus,
        u.last_seen as lastSeen,
        c.last_message as lastMessage,
        c.last_message_time as lastMessageTime,
        (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id AND m.recipient_id = ? AND m.status != 'read') as unreadCount
      FROM chats c
      JOIN users u ON (CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END) = u.id
      WHERE c.user1_id = ? OR c.user2_id = ?
      ORDER BY c.last_message_time DESC`,
      [userId, userId, userId, userId]
    );

    res.json({ chats });
  } catch (err) {
    console.error('Fetch chats error:', err);
    res.status(500).json({ error: 'Error fetching chats' });
  }
});

// Create/Get Chat
app.post('/api/chats', async (req, res) => {
  try {
    const db = getDb();
    const { currentUserId, contactId } = req.body;

    const user1 = Math.min(currentUserId, contactId);
    const user2 = Math.max(currentUserId, contactId);

    let chat = await db.get('SELECT * FROM chats WHERE user1_id = ? AND user2_id = ?', [user1, user2]);
    if (!chat) {
      const result = await db.run(
        'INSERT INTO chats (user1_id, user2_id, last_message, last_message_time) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [user1, user2, 'Chat started']
      );
      chat = await db.get('SELECT * FROM chats WHERE id = ?', [result.lastID]);
    }

    const contact = await db.get('SELECT id, username, name, phone, avatar, about, status, last_seen FROM users WHERE id = ?', [contactId]);
    res.json({ chat, contact });
  } catch (err) {
    console.error('Create chat error:', err);
    res.status(500).json({ error: 'Error creating chat' });
  }
});

// Get Messages
app.get('/api/messages/:chatId', async (req, res) => {
  try {
    const db = getDb();
    const { chatId } = req.params;

    const messages = await db.all(
      `SELECT m.*, u.name as senderName 
       FROM messages m 
       JOIN users u ON m.sender_id = u.id 
       WHERE m.chat_id = ? 
       ORDER BY m.timestamp ASC`,
      [chatId]
    );

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

// Upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

/* --- SOCKET.IO REALTIME ENGINE --- */
io.on('connection', (socket) => {
  console.log('⚡ Socket connected:', socket.id);

  socket.on('user_online', async (userId) => {
    if (!userId) return;
    socket.userId = userId;
    activeSockets.set(Number(userId), socket.id);

    try {
      const db = getDb();
      await db.run("UPDATE users SET status = 'online' WHERE id = ?", [userId]);
      io.emit('user_status_change', { userId: Number(userId), status: 'online' });
    } catch (e) {
      console.error('Online status error:', e);
    }
  });

  socket.on('send_message', async (data) => {
    const { chatId, senderId, recipientId, text, type, mediaUrl, duration, templateData, optionsData } = data;

    try {
      const db = getDb();
      const timeNow = new Date().toISOString();

      const recipientSocketId = activeSockets.get(Number(recipientId));
      const initialStatus = recipientSocketId ? 'delivered' : 'sent';

      const result = await db.run(
        `INSERT INTO messages (chat_id, sender_id, recipient_id, text, type, media_url, duration, template_data, options_data, status, timestamp) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          chatId, 
          senderId, 
          recipientId, 
          text || '', 
          type || 'text', 
          mediaUrl || '', 
          duration || '', 
          templateData ? JSON.stringify(templateData) : '', 
          optionsData ? JSON.stringify(optionsData) : '', 
          initialStatus, 
          timeNow
        ]
      );

      const formattedMsg = {
        id: result.lastID,
        chat_id: chatId,
        sender_id: senderId,
        recipient_id: recipientId,
        text,
        type: type || 'text',
        media_url: mediaUrl || '',
        duration: duration || '',
        template_data: templateData ? JSON.stringify(templateData) : '',
        options_data: optionsData ? JSON.stringify(optionsData) : '',
        status: initialStatus,
        timestamp: timeNow
      };

      const snippet = type === 'image' ? '📷 Photo' : type === 'audio' ? '🎵 Voice Note' : text;
      await db.run('UPDATE chats SET last_message = ?, last_message_time = ? WHERE id = ?', [snippet, timeNow, chatId]);

      socket.emit('message_sent', formattedMsg);

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('new_message', formattedMsg);
      }
    } catch (err) {
      console.error('Send message socket error:', err);
    }
  });

  socket.on('typing', ({ chatId, recipientId, senderName }) => {
    const recipientSocketId = activeSockets.get(Number(recipientId));
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user_typing', { chatId, senderName });
    }
  });

  socket.on('stop_typing', ({ chatId, recipientId }) => {
    const recipientSocketId = activeSockets.get(Number(recipientId));
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user_stop_typing', { chatId });
    }
  });

  socket.on('mark_read', async ({ chatId, userId, senderId }) => {
    try {
      const db = getDb();
      await db.run(
        `UPDATE messages SET status = 'read' WHERE chat_id = ? AND recipient_id = ? AND status != 'read'`,
        [chatId, userId]
      );

      const senderSocketId = activeSockets.get(Number(senderId));
      if (senderSocketId) {
        io.to(senderSocketId).emit('messages_read_update', { chatId });
      }
    } catch (e) {
      console.error('Mark read error:', e);
    }
  });

  socket.on('disconnect', async () => {
    if (socket.userId) {
      activeSockets.delete(Number(socket.userId));
      try {
        const db = getDb();
        const lastSeenTime = new Date().toISOString();
        await db.run("UPDATE users SET status = 'offline', last_seen = ? WHERE id = ?", [lastSeenTime, socket.userId]);
        io.emit('user_status_change', { userId: Number(socket.userId), status: 'offline', lastSeen: lastSeenTime });
      } catch (e) {
        console.error('Disconnect status error:', e);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Realtime WhatsApp Support Server running on http://localhost:${PORT}`);
  });
});
