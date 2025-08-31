import { type User, type InsertUser, type Room, type InsertRoom, type RoomParticipant, type InsertRoomParticipant } from "@shared/schema";
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private rooms: Map<string, Room>;
  private roomParticipants: Map<string, RoomParticipant>;

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    this.roomParticipants = new Map();
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
}

export const storage = new MemStorage();
