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

  // Enable foreign keys
  await db.run('PRAGMA foreign_keys = ON');

  // Create Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      about TEXT DEFAULT 'Available | Using Realtime WhatsApp',
      status TEXT DEFAULT 'offline',
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

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
      status TEXT DEFAULT 'sent',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES chats (id),
      FOREIGN KEY (sender_id) REFERENCES users (id),
      FOREIGN KEY (recipient_id) REFERENCES users (id)
    );
  `);

  console.log('✅ SQLite Database initialized successfully at:', dbPath);
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized! Call initDb() first.');
  }
  return db;
}
