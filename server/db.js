import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

export async function initDb() {
  if (db) return db;

  const dbPath = path.join(__dirname, 'whatsapp.db');
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.run('PRAGMA foreign_keys = ON');

  // Create Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      avatar TEXT,
      about TEXT DEFAULT 'Available | WhatsApp Support',
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'offline',
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try { await db.exec("ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''"); } catch (e) {}
  try { await db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'"); } catch (e) {}

  // Create Chats table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1_id INTEGER NOT NULL,
      user2_id INTEGER NOT NULL,
      last_message TEXT DEFAULT '',
      last_message_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user1_id) REFERENCES users (id),
      FOREIGN KEY (user2_id) REFERENCES users (id),
      UNIQUE(user1_id, user2_id)
    );
  `);

  // Create Messages table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      recipient_id INTEGER NOT NULL,
      text TEXT DEFAULT '',
      type TEXT DEFAULT 'text',
      media_url TEXT DEFAULT '',
      duration TEXT DEFAULT '',
      template_data TEXT DEFAULT '',
      options_data TEXT DEFAULT '',
      status TEXT DEFAULT 'sent',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES chats (id),
      FOREIGN KEY (sender_id) REFERENCES users (id),
      FOREIGN KEY (recipient_id) REFERENCES users (id)
    );
  `);

  try { await db.exec("ALTER TABLE messages ADD COLUMN template_data TEXT DEFAULT ''"); } catch (e) {}
  try { await db.exec("ALTER TABLE messages ADD COLUMN options_data TEXT DEFAULT ''"); } catch (e) {}

  // Ensure default Admin/Support Account exists with password "admin"
  const adminUser = await db.get("SELECT id FROM users WHERE username = 'admin' OR username = 'support'");
  if (!adminUser) {
    await db.run(
      `INSERT INTO users (username, password, name, phone, avatar, about, role, status) 
       VALUES ('admin', 'admin', 'Support ✓', '+91 98765 43210', 
       'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80', 
       '24/7 Live Customer Support', 'admin', 'online')`
    );
    console.log('✅ Admin Account Created with Username: admin, Password: admin');
  } else {
    // Update password to 'admin'
    await db.run("UPDATE users SET password = 'admin', role = 'admin' WHERE username = 'admin' OR username = 'support'");
  }

  console.log('✅ SQLite Database initialized successfully!');
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized!');
  }
  return db;
}
