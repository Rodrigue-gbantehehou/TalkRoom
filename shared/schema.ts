import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const roomParticipants = pgTable("room_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull().default("user"), // "user" or "admin"
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertRoomSchema = createInsertSchema(rooms).pick({
  id: true,
  name: true,
});

export const insertRoomParticipantSchema = createInsertSchema(roomParticipants).pick({
  roomId: true,
  userId: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertRoomParticipant = z.infer<typeof insertRoomParticipantSchema>;
export type RoomParticipant = typeof roomParticipants.$inferSelect;

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

export type SocketMessage = 
  | { type: 'user'; id: string; content: string; senderId: string; senderName: string; timestamp: number; imageUrl?: string }
  | { type: 'typing'; userId: string; username: string; isTyping: boolean }
  | { type: 'user_joined'; userId: string; username: string; timestamp: number }
  | { type: 'user_left'; userId: string; username: string; timestamp: number }
  | { type: 'reaction'; messageId: string; emoji: string; userId: string; username: string }
  | { type: 'delete_message'; messageId: string; timestamp: number };
