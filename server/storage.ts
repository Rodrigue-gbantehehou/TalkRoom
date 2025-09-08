import { type User, type InsertUser, type Room, type InsertRoom, type RoomParticipant, type InsertRoomParticipant, type StoredMessage, type InsertMessage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getRoom(id: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  deleteRoom(id: string): Promise<void>;
  
  getRoomParticipants(roomId: string): Promise<RoomParticipant[]>;
  addRoomParticipant(participant: InsertRoomParticipant): Promise<RoomParticipant>;
  removeRoomParticipant(roomId: string, userId: string): Promise<void>;
  getRoomParticipant(roomId: string, userId: string): Promise<RoomParticipant | undefined>;
  
  getRoomMessages(roomId: string): Promise<StoredMessage[]>;
  createMessage(message: InsertMessage): Promise<StoredMessage>;
  deleteMessage(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private rooms: Map<string, Room>;
  private roomParticipants: Map<string, RoomParticipant>;
  private messages: Map<string, StoredMessage>;

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    this.roomParticipants = new Map();
    this.messages = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getRoom(id: string): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const room: Room = { 
      ...insertRoom, 
      name: insertRoom.name || null,
      createdAt: new Date(),
      isActive: true 
    };
    this.rooms.set(room.id, room);
    return room;
  }

  async deleteRoom(id: string): Promise<void> {
    this.rooms.delete(id);
    // Also remove all participants
    Array.from(this.roomParticipants.keys())
      .filter(key => this.roomParticipants.get(key)?.roomId === id)
      .forEach(key => this.roomParticipants.delete(key));
  }

  async getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
    return Array.from(this.roomParticipants.values()).filter(
      (participant) => participant.roomId === roomId,
    );
  }

  async addRoomParticipant(insertParticipant: InsertRoomParticipant): Promise<RoomParticipant> {
    const id = randomUUID();
    const participant: RoomParticipant = { 
      ...insertParticipant, 
      id,
      role: insertParticipant.role || 'user',
      joinedAt: new Date() 
    };
    this.roomParticipants.set(id, participant);
    return participant;
  }

  async removeRoomParticipant(roomId: string, userId: string): Promise<void> {
    const participantKey = Array.from(this.roomParticipants.keys()).find(key => {
      const participant = this.roomParticipants.get(key);
      return participant?.roomId === roomId && participant?.userId === userId;
    });
    
    if (participantKey) {
      this.roomParticipants.delete(participantKey);
    }
  }

  async getRoomParticipant(roomId: string, userId: string): Promise<RoomParticipant | undefined> {
    return Array.from(this.roomParticipants.values()).find(
      (participant) => participant.roomId === roomId && participant.userId === userId,
    );
  }

  async getRoomMessages(roomId: string): Promise<StoredMessage[]> {
    return Array.from(this.messages.values())
      .filter((message) => message.roomId === roomId)
      .sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));
  }

  async createMessage(insertMessage: InsertMessage): Promise<StoredMessage> {
    const id = randomUUID();
    const message: StoredMessage = { 
      ...insertMessage, 
      id,
      timestamp: new Date(),
      type: insertMessage.type || 'user',
      imageUrl: insertMessage.imageUrl || null
    };
    this.messages.set(id, message);
    return message;
  }

  async deleteMessage(id: string): Promise<void> {
    this.messages.delete(id);
  }
}

// Database storage implementation using Drizzle
import { db } from "./db";
import { users, rooms, roomParticipants, messages } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getRoom(id: string): Promise<Room | undefined> {
    const result = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
    return result[0];
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const result = await db.insert(rooms).values(insertRoom).returning();
    return result[0];
  }

  async deleteRoom(id: string): Promise<void> {
    await db.delete(rooms).where(eq(rooms.id, id));
    await db.delete(roomParticipants).where(eq(roomParticipants.roomId, id));
  }

  async getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
    return await db.select().from(roomParticipants).where(eq(roomParticipants.roomId, roomId));
  }

  async addRoomParticipant(insertParticipant: InsertRoomParticipant): Promise<RoomParticipant> {
    const result = await db.insert(roomParticipants).values(insertParticipant).returning();
    return result[0];
  }

  async removeRoomParticipant(roomId: string, userId: string): Promise<void> {
    await db.delete(roomParticipants)
      .where(and(eq(roomParticipants.roomId, roomId), eq(roomParticipants.userId, userId)));
  }

  async getRoomParticipant(roomId: string, userId: string): Promise<RoomParticipant | undefined> {
    const result = await db.select().from(roomParticipants)
      .where(and(eq(roomParticipants.roomId, roomId), eq(roomParticipants.userId, userId)))
      .limit(1);
    return result[0];
  }

  async getRoomMessages(roomId: string): Promise<StoredMessage[]> {
    return await db.select().from(messages)
      .where(eq(messages.roomId, roomId))
      .orderBy(messages.timestamp);
  }

  async createMessage(insertMessage: InsertMessage): Promise<StoredMessage> {
    const result = await db.insert(messages).values(insertMessage).returning();
    return result[0];
  }

  async deleteMessage(id: string): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  }
}

export const storage = new DbStorage();
