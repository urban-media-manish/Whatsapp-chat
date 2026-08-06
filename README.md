# 🚀 Enterprise Live Customer Support Platform

A premium, enterprise-grade **Live Customer Support Platform** inspired by **WhatsApp Web**, **Intercom**, **Crisp**, **WATI**, and **Zendesk**. Built with React 19, Vite, TypeScript, Tailwind CSS, Framer Motion, Node.js, Express.js, Socket.IO, and MongoDB (with Mongoose).

---

## ✨ Features Overview

### 👤 Customer Portal (`/chat`)
- **Instant Guest or Named Login**: Register with Name + Phone or click "Continue as Guest".
- **Auto Session Restoration**: Session ID automatically preserved in LocalStorage/Session.
- **WhatsApp Web Messaging Interface**:
  - Sent (`✓`), Delivered (`✓✓`), and Blue Read (`✓✓`) receipt ticks.
  - Live **Online status** and **"Support Agent is typing..."** indicators.
  - **Voice Notes Recorder**: Record audio using browser `MediaRecorder` with visual timer.
  - **Rich Media Upload**: Images, Videos, Audio, PDF, Word, Excel, and ZIP attachments.
  - **Emoji Picker & Quick Reactions** (👍, ❤️, 😂, 😮, 😢, 🙏).
  - Quoted message reply, message edit, and deletion capabilities.
  - Dark & Light mode toggle.
  - Mobile QR code chat launcher.

### 🛡️ Admin Workspace (`/admin`)
- **JWT Auth & Role-Based Access Control** (Admin, Manager, Support Agent).
- **3-Pane WhatsApp Web + Intercom Hybrid Dashboard**:
  - **Left Sidebar**: Customer search, status & filter tabs (All, Unread, Mine, Pinned, Archived), priority badges, online green dots, unread count pills.
  - **Center Live Workspace**: Real-time message stream, priority selector, ticket status selector (Open, Pending, Resolved, Closed), agent reassignment, PDF & CSV export buttons.
  - **Right Customer CRM Panel**: Customer metadata, AI Sentiment & Intent analysis gauge, AI Ticket Summarizer, Private Agent Notes timeline, Tag/Label manager.
- **AI-Powered Features**:
  - **AI Suggested Replies**: 3 context-aware quick response pills for support staff.
  - **AI Auto-Summaries**: Summarizes ticket resolution history into concise bullet points.
  - **AI Sentiment & Intent Gauge**: Automatically classifies customer mood & topic.
  - **Canned Quick Replies**: Type `/` in input to trigger template shortcuts.

### 📊 Analytics & Reporting (`/admin/analytics`)
- High-level KPIs: Total Customers, Active Tickets, Avg Response Time, CSAT Score %.
- Weekly ticket resolution bar charts and volume breakdowns.

---

## 🛠️ Installation & Getting Started

### 1. Prerequisites
- Node.js `v18+` or `v20+` installed.

### 2. Quick Start Command
Run the root orchestrator script to start both Backend Server (port 5000) and Frontend App (port 5173) concurrently:

```bash
# Clone or navigate to project directory
cd "whatsapp site"

# Install all dependencies
npm install

# Start both Server & Client concurrently
npm run dev
```

Open your browser to:
- **Customer Chat Portal**: [http://localhost:5173/chat](http://localhost:5173/chat)
- **Admin Workspace**: [http://localhost:5173/admin](http://localhost:5173/admin)
- **Admin Login**: [http://localhost:5173/admin/login](http://localhost:5173/admin/login)

---

## 🔑 Default Credentials

The system automatically seeds demo staff accounts on startup:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@support.com` | `admin123` |
| **Support Agent** | `agent@support.com` | `agent123` |
| **Manager** | `manager@support.com` | `manager123` |

---

## 🐳 Docker Support

To run the application inside Docker containers:

```bash
docker-compose up --build
```

---

## 🔒 Security Measures
- JWT Bearer Authentication & Refresh Tokens.
- Helmet security header protection.
- Express Rate Limiting against brute-force attacks.
- CORS policy and Multer file type limits.
