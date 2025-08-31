import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { Message, ChatUser, ChatState } from '@/types/chat';

interface ChatContextType extends ChatState {
  addMessage: (message: Message) => void;
  updateParticipants: (participants: ChatUser[]) => void;
  setCurrentUser: (user: ChatUser | null) => void;
  setRoomCode: (code: string) => void;
  setIsConnected: (connected: boolean) => void;
  addTypingUser: (username: string) => void;
  removeTypingUser: (username: string) => void;
  clearMessages: () => void;
  incrementMessageCount: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

type ChatAction = 
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_PARTICIPANTS'; payload: ChatUser[] }
  | { type: 'SET_CURRENT_USER'; payload: ChatUser | null }
  | { type: 'SET_ROOM_CODE'; payload: string }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'ADD_TYPING_USER'; payload: string }
  | { type: 'REMOVE_TYPING_USER'; payload: string }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'INCREMENT_MESSAGE_COUNT' };

const MAX_MESSAGES = 100; // Limit messages to prevent memory overload

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      const newMessages = [...state.messages, action.payload];
      // Keep only the last MAX_MESSAGES to prevent memory overload
      if (newMessages.length > MAX_MESSAGES) {
        newMessages.splice(0, newMessages.length - MAX_MESSAGES);
      }
      return { ...state, messages: newMessages };
    
    case 'UPDATE_PARTICIPANTS':
      return { ...state, participants: action.payload };
    
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    
    case 'SET_ROOM_CODE':
      return { ...state, roomCode: action.payload };
    
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    
    case 'ADD_TYPING_USER':
      if (!state.typingUsers.includes(action.payload)) {
        return { ...state, typingUsers: [...state.typingUsers, action.payload] };
      }
      return state;
    
    case 'REMOVE_TYPING_USER':
      return { 
        ...state, 
        typingUsers: state.typingUsers.filter(user => user !== action.payload) 
      };
    
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [], messageCount: 0 };
    
    case 'INCREMENT_MESSAGE_COUNT':
      return { ...state, messageCount: state.messageCount + 1 };
    
    default:
      return state;
  }
}

const initialState: ChatState = {
  isConnected: false,
  currentUser: null,
  roomCode: '',
  messages: [],
  participants: [],
  typingUsers: [],
  messageCount: 0
};

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const addMessage = useCallback((message: Message) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });
    dispatch({ type: 'INCREMENT_MESSAGE_COUNT' });
  }, []);

  const updateParticipants = useCallback((participants: ChatUser[]) => {
    dispatch({ type: 'UPDATE_PARTICIPANTS', payload: participants });
  }, []);

  const setCurrentUser = useCallback((user: ChatUser | null) => {
    dispatch({ type: 'SET_CURRENT_USER', payload: user });
  }, []);

  const setRoomCode = useCallback((code: string) => {
    dispatch({ type: 'SET_ROOM_CODE', payload: code });
  }, []);

  const setIsConnected = useCallback((connected: boolean) => {
    dispatch({ type: 'SET_CONNECTED', payload: connected });
  }, []);

  const addTypingUser = useCallback((username: string) => {
    dispatch({ type: 'ADD_TYPING_USER', payload: username });
  }, []);

  const removeTypingUser = useCallback((username: string) => {
    dispatch({ type: 'REMOVE_TYPING_USER', payload: username });
  }, []);

  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  }, []);

  const incrementMessageCount = useCallback(() => {
    dispatch({ type: 'INCREMENT_MESSAGE_COUNT' });
  }, []);

  return (
    <ChatContext.Provider value={{
      ...state,
      addMessage,
      updateParticipants,
      setCurrentUser,
      setRoomCode,
      setIsConnected,
      addTypingUser,
      removeTypingUser,
      clearMessages,
      incrementMessageCount
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
