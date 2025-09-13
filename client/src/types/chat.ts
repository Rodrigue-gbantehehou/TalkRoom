export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  type: 'user' | 'system' | 'image';
  imageUrl?: string;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  username: string;
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
  roomClosed: boolean;
}
