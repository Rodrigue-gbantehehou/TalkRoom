import { z } from "zod";

// ===================== AUTHENTICATION =====================
export const signupSchema = z.object({
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  displayName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export type SignupRequest = z.infer<typeof signupSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
  };
  message?: string;
}

// ===================== USERS =====================
export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string().optional(), // Pour l'authentification
  displayName: z.string().optional(),
  avatarUrl: z.string().optional().nullable(),
  bio: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

export interface User {
  id: string;
  username: string;
  password?: string; // Pour l'authentification (ne sera pas exposé côté client)
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
  sender_id: string; // Champ réel en base de données
  content: string;
  type: "user" | "system" | "image";
  imageUrl?: string | null;
  timestamp: string;
}
