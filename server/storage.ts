import {
  type User,
  type InsertUser,
  type Room,
  type InsertRoom,
  type RoomParticipant,
  type InsertRoomParticipant,
  type StoredMessage,
  type InsertMessage,
} from "@shared/schema";
import supabase from "./db";

export class DbStorage {
  // === USERS ===
  async getUser(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();
    if (error) throw error;
    return data;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { data, error } = await supabase
      .from("users")
      .insert({
        username: insertUser.username,
        displayname: insertUser.displayName ?? null,
        avatarurl: insertUser.avatarUrl ?? null,
        bio: insertUser.bio ?? null,
        isonline: false,
        lastseen: new Date().toISOString(),
        createdat: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data!;
  }

  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    const { error } = await supabase
      .from("users")
      .update({ isonline: isOnline, lastseen: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw error;
  }

  // === ROOMS ===
  async getRoom(id: string): Promise<Room | null> {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  }

  async createRoom(insertRoom: InsertRoom, creatorId: string): Promise<Room> {
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        id: insertRoom.id,
        name: insertRoom.name,
        avatarUrl: insertRoom.avatarUrl ?? null,
        description: insertRoom.description ?? null,
        type: insertRoom.type ?? "public",
        owner_id: creatorId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data!;
  }
async getRooms(): Promise<Room[]> {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("createdAt", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }


  async deleteRoom(id: string): Promise<void> {
    await supabase.from("room_participants").delete().eq("roomid", id);
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) throw error;
  }

  // === PARTICIPANTS ===
  async getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
    const { data, error } = await supabase
      .from("room_participants")
      .select("*")
      .eq("roomid", roomId);
    if (error) throw error;
    return data ?? [];
  }

  async addRoomParticipant(insertParticipant: InsertRoomParticipant): Promise<RoomParticipant> {
    const { data, error } = await supabase
      .from("room_participants")
      .insert({
        roomid: insertParticipant.roomId,
        userid: insertParticipant.userId,
        role: insertParticipant.role ?? "user",
      })
      .select()
      .single();
    if (error) throw error;
    return data!;
  }

  async removeRoomParticipant(roomId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("room_participants")
      .delete()
      .match({ roomid: roomId, userid: userId });
    if (error) throw error;
  }

  async getRoomParticipant(roomId: string, userId: string): Promise<RoomParticipant | null> {
    const { data, error } = await supabase
      .from("room_participants")
      .select("*")
      .match({ roomid: roomId, userid: userId })
      .single();
    if (error) throw error;
    return data;
  }

  // === MESSAGES ===
  async getRoomMessages(roomId: string): Promise<StoredMessage[]> {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("roomid", roomId)
      .order("timestamp", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async createMessage(insertMessage: InsertMessage): Promise<StoredMessage> {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        roomid: insertMessage.roomId,
        senderid: insertMessage.userId,
        content: insertMessage.content,
        type: insertMessage.type ?? "user",
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data!;
  }

  async deleteMessage(id: string): Promise<void> {
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) throw error;
  }
}

// Export global
export const storage = new DbStorage();
