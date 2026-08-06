export type Role = 'admin' | 'manager' | 'agent';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  avatar?: string;
  status: 'online' | 'offline' | 'busy' | 'away';
  token?: string;
}

export interface Customer {
  _id: string;
  sessionId: string;
  name: string;
  phone: string;
  avatar: string;
  isGuest: boolean;
  blocked: boolean;
  muted: boolean;
  tags: string[];
  notes?: string;
  metadata?: {
    ip?: string;
    userAgent?: string;
    location?: string;
    browser?: string;
  };
  lastSeen?: string;
}

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';

export interface Conversation {
  _id: string;
  customer: Customer;
  assignedAgent?: User | null;
  status: TicketStatus;
  priority: Priority;
  unreadCount: number;
  unreadCountCustomer?: number;
  lastMessage?: {
    content: string;
    senderType: 'customer' | 'agent' | 'system';
    type: string;
    timestamp: string;
  };
  isPinned: boolean;
  isArchived: boolean;
  tags: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated' | 'urgent';
  intent: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'file';

export interface Reaction {
  emoji: string;
  by: string;
  byName?: string;
}

export interface Message {
  _id: string;
  conversation: string;
  senderType: 'customer' | 'agent' | 'system';
  senderId: string;
  senderName: string;
  content: string;
  type: MessageType;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  status: 'sent' | 'delivered' | 'read';
  reactions: Reaction[];
  replyTo?: Message | string;
  replyToSnippet?: {
    content: string;
    senderName: string;
    type: string;
  };
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: string;
}

export interface Note {
  _id: string;
  conversation: string;
  agent: string;
  agentName: string;
  content: string;
  createdAt: string;
}

export interface QuickReply {
  _id: string;
  title: string;
  shortcut: string;
  content: string;
  category?: string;
}

export interface AnalyticsData {
  metrics: {
    totalCustomers: number;
    totalChats: number;
    openChats: number;
    pendingChats: number;
    resolvedChats: number;
    closedChats: number;
    avgResponseTimeSec: number;
    avgResolutionTimeMin: number;
    csatScorePercentage: number;
  };
  priorityBreakdown: {
    urgent: number;
    high: number;
    medium: number;
  };
  chartData: Array<{
    day: string;
    total: number;
    resolved: number;
  }>;
}
