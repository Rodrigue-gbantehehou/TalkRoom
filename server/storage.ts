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
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { data, error } = await supabase
      .from("users")
      .insert({
        username: insertUser.username,
        password: insertUser.password ?? null,
        display_name: insertUser.displayName ?? null,
        avatar_url: insertUser.avatarUrl ?? null,
        bio: insertUser.bio ?? null,
        is_online: false,
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Failed to create user - no data returned");
    return data;
  }

  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    const { error } = await supabase
      .from("users")
      .update({ is_online: isOnline, last_seen: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw error;
  }

  // === ROOMS ===
  async getRoom(id: string): Promise<Room | null> {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async getRooms(): Promise<Room[]> {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async createRoom(insertRoom: InsertRoom, creatorId: string): Promise<Room> {
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        id: insertRoom.id,
        name: insertRoom.name,
        avatar_url: insertRoom.avatarUrl ?? null,
        description: insertRoom.description ?? null,
        type: insertRoom.type ?? "public",
        owner_id: creatorId,
        created_at: new Date().toISOString(),
        is_active: true,
        last_activity: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Failed to create room - no data returned");
    return data;
  }

  // === PARTICIPANTS ===
  async getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
    const { data, error } = await supabase
      .from("room_participants")
      .select("*")
      .eq("room_id", roomId);
    if (error) throw error;
    return data ?? [];
  }

  async addRoomParticipant(insertParticipant: InsertRoomParticipant): Promise<RoomParticipant> {
    const { data, error } = await supabase
      .from("room_participants")
      .insert({
        room_id: insertParticipant.roomId,
        user_id: insertParticipant.userId,
        role: insertParticipant.role ?? "user",
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Failed to add participant - no data returned");
    return data;
  }

  async removeRoomParticipant(roomId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("room_participants")
      .delete()
      .match({ room_id: roomId, user_id: userId });
    if (error) throw error;
  }

  async getRoomParticipant(roomId: string, userId: string): Promise<RoomParticipant | null> {
    console.log('getRoomParticipant - roomId:', roomId, 'userId:', userId);
    
    // Vérifier que userId n'est pas undefined
    if (!userId || userId === 'undefined') {
      console.error('UserId invalide dans getRoomParticipant:', userId);
      throw new Error('UserId invalide');
    }
    
    const { data, error } = await supabase
      .from("room_participants")
      .select("*")
      .match({ room_id: roomId, user_id: userId })
      .maybeSingle();
    if (error) {
      console.error('Erreur getRoomParticipant:', error);
      throw error;
    }
    return data;
  }

  // === MESSAGES ===
  async getRoomMessages(roomId: string): Promise<StoredMessage[]> {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("timestamp", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async createMessage(insertMessage: InsertMessage): Promise<StoredMessage> {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        room_id: insertMessage.roomId,
        sender_id: insertMessage.userId,
        content: insertMessage.content,
        type: insertMessage.type ?? "user",
        image_url: insertMessage.imageUrl ?? null,
        timestamp: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Failed to create message - no data returned");
    return data;
  }

  async deleteMessage(id: string): Promise<void> {
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) throw error;
  }

  async deleteRoomMessages(roomId: string): Promise<void> {
    const { error } = await supabase.from("messages").delete().eq("room_id", roomId);
    if (error) throw error;
  }

  async deleteRoom(roomId: string): Promise<void> {
    const { error } = await supabase.from("rooms").delete().eq("id", roomId);
    if (error) throw error;
  }

  async updateRoomParticipantRole(roomId: string, userId: string, role: 'admin' | 'user'): Promise<void> {
    const { error } = await supabase
      .from("room_participants")
      .update({ role })
      .match({ room_id: roomId, user_id: userId });
    if (error) throw error;
  }
}

export const storage = new DbStorage();
