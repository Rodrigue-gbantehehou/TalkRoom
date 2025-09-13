import { z } from "zod";

// ===================== USERS =====================
export const insertUserSchema = z.object({
  username: z.string(),
  displayName: z.string().optional(),
  avatarUrl: z.string().optional().nullable(),
  bio: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

export interface User {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
}

// ===================== ROOMS =====================
export const insertRoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  type: z.enum(["public", "private"]).optional(),
  createdById: z.string(),
});

export type InsertRoom = z.infer<typeof insertRoomSchema>;

export interface Room {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  type: "public" | "private";
  createdById: string;
  createdAt: string;
  isActive: boolean;
  lastActivity: string;
}

// ===================== ROOM PARTICIPANTS =====================
export const insertRoomParticipantSchema = z.object({
  roomId: z.string(),
  userId: z.string(),
  role: z.enum(["user", "admin"]).optional(),
});

export type InsertRoomParticipant = z.infer<typeof insertRoomParticipantSchema>;

export interface RoomParticipant {
  roomId: string;
  userId: string;
  role: "user" | "admin";
}

// ===================== MESSAGES =====================
export const insertMessageSchema = z.object({
  roomId: z.string(),
  userId: z.string(),
  content: z.string(),
  type: z.enum(["user", "system", "image"]).optional(),
  imageUrl: z.string().optional().nullable(),
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;

export interface StoredMessage {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  type: "user" | "system" | "image";
  imageUrl?: string | null;
  timestamp: string;
}
