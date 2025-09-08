import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey(),
  name: text("name"),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  type: text("type").notNull().default("public"), // "public" | "private"
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  lastActivity: timestamp("last_activity").defaultNow(),
});

export const roomParticipants = pgTable("room_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull().default("user"), // "user" or "admin"
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  senderId: varchar("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  roomId: varchar("room_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  type: text("type").notNull().default("user"), // "user" | "system" | "image"
  imageUrl: text("image_url"),
  expiresAt: timestamp("expires_at"),
  expiryDuration: varchar("expiry_duration").default("1h"), // "15s" | "1min" | "5min" | "1h" | "24h" | "never"
  deleteAfterRead: boolean("delete_after_read").default(false),
  isRead: boolean("is_read").default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
});

export const insertRoomSchema = createInsertSchema(rooms).pick({
  id: true,
  name: true,
  description: true,
  avatarUrl: true,
  type: true,
  createdBy: true,
});

export const insertRoomParticipantSchema = createInsertSchema(roomParticipants).pick({
  roomId: true,
  userId: true,
  role: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  senderId: true,
  senderName: true,
  roomId: true,
  type: true,
  imageUrl: true,
  expiryDuration: true,
  deleteAfterRead: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertRoomParticipant = z.infer<typeof insertRoomParticipantSchema>;
export type RoomParticipant = typeof roomParticipants.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type StoredMessage = typeof messages.$inferSelect;

// Frontend-only types for P2P messaging
export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  type: 'user' | 'system' | 'image';
  imageUrl?: string;
  reactions?: MessageReaction[];
  expiresAt?: Date;
  expiryDuration?: string;
  deleteAfterRead?: boolean;
  isRead?: boolean;
  timeRemaining?: number;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  username: string;
}

export interface ChatUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  isOnline: boolean;
  lastSeen?: Date;
  bio?: string;
}

export interface RoomData {
  id: string;
  name?: string;
  participants: ChatUser[];
  messageCount: number;
}

export type SocketMessage = 
  | { type: 'user'; id: string; content: string; senderId: string; senderName: string; timestamp: number; imageUrl?: string }
  | { type: 'typing'; userId: string; username: string; isTyping: boolean }
  | { type: 'user_joined'; userId: string; username: string; timestamp: number; isOnline?: boolean }
  | { type: 'user_left'; userId: string; username: string; timestamp: number; isOnline?: boolean }
  | { type: 'online_users'; users: { userId: string; username: string; isOnline: boolean }[] }
  | { type: 'user_status_change'; userId: string; username: string; isOnline: boolean }
  | { type: 'reaction'; messageId: string; emoji: string; userId: string; username: string }
  | { type: 'delete_message'; messageId: string; timestamp: number };
