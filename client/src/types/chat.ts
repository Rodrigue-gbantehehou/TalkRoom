export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  type: 'user' | 'system';
}

export interface ChatUser {
  id: string;
  username: string;
  role: 'user' | 'admin';
  isOnline: boolean;
}

export interface RoomData {
  id: string;
  name?: string;
  participants: ChatUser[];
  messageCount: number;
}

export interface WebRTCSignal {
  type: 'offer' | 'answer' | 'ice-candidate';
  data: any;
}

export interface ChatState {
  isConnected: boolean;
  currentUser: ChatUser | null;
  roomCode: string;
  messages: Message[];
  participants: ChatUser[];
  typingUsers: string[];
  messageCount: number;
}
