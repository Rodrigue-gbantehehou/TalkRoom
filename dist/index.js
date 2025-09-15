// server/index.ts
import "dotenv/config";
import express3 from "express";
import cors from "cors";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import express from "express";
import { randomUUID } from "crypto";

// server/db.ts
import { createClient } from "@supabase/supabase-js";
console.log("Creating Supabase client...");
console.log("URL:", process.env.SUPABASE_URL);
console.log("KEY:", process.env.SUPABASE_SERVICE_KEY);
var supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
var db_default = supabase;

// server/storage.ts
var DbStorage = class {
  // === USERS ===
  async getUser(id) {
    const { data, error } = await db_default.from("users").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  }
  async getUserByUsername(username) {
    const { data, error } = await db_default.from("users").select("*").eq("username", username).maybeSingle();
    if (error) throw error;
    return data;
  }
  async createUser(insertUser) {
    const { data, error } = await db_default.from("users").insert({
      username: insertUser.username,
      password: insertUser.password ?? null,
      display_name: insertUser.displayName ?? null,
      avatar_url: insertUser.avatarUrl ?? null,
      bio: insertUser.bio ?? null,
      is_online: false,
      last_seen: (/* @__PURE__ */ new Date()).toISOString(),
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    }).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Failed to create user - no data returned");
    return data;
  }
  async updateUserOnlineStatus(userId, isOnline) {
    const { error } = await db_default.from("users").update({ is_online: isOnline, last_seen: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", userId);
    if (error) throw error;
  }
  // === ROOMS ===
  async getRoom(id) {
    const { data, error } = await db_default.from("rooms").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  }
  async getRooms() {
    const { data, error } = await db_default.from("rooms").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }
  async createRoom(insertRoom, creatorId) {
    const { data, error } = await db_default.from("rooms").insert({
      id: insertRoom.id,
      name: insertRoom.name,
      avatar_url: insertRoom.avatarUrl ?? null,
      description: insertRoom.description ?? null,
      type: insertRoom.type ?? "public",
      owner_id: creatorId,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      is_active: true,
      last_activity: (/* @__PURE__ */ new Date()).toISOString()
    }).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Failed to create room - no data returned");
    return data;
  }
  // === PARTICIPANTS ===
  async getRoomParticipants(roomId) {
    const { data, error } = await db_default.from("room_participants").select("*").eq("room_id", roomId);
    if (error) throw error;
    return data ?? [];
  }
  async addRoomParticipant(insertParticipant) {
    const { data, error } = await db_default.from("room_participants").insert({
      room_id: insertParticipant.roomId,
      user_id: insertParticipant.userId,
      role: insertParticipant.role ?? "user"
    }).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Failed to add participant - no data returned");
    return data;
  }
  async removeRoomParticipant(roomId, userId) {
    const { error } = await db_default.from("room_participants").delete().match({ room_id: roomId, user_id: userId });
    if (error) throw error;
  }
  async getRoomParticipant(roomId, userId) {
    console.log("getRoomParticipant - roomId:", roomId, "userId:", userId);
    if (!userId || userId === "undefined") {
      console.error("UserId invalide dans getRoomParticipant:", userId);
      throw new Error("UserId invalide");
    }
    const { data, error } = await db_default.from("room_participants").select("*").match({ room_id: roomId, user_id: userId }).maybeSingle();
    if (error) {
      console.error("Erreur getRoomParticipant:", error);
      throw error;
    }
    return data;
  }
  // === MESSAGES ===
  async getRoomMessages(roomId) {
    const { data, error } = await db_default.from("messages").select("*").eq("room_id", roomId).order("timestamp", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }
  async createMessage(insertMessage) {
    const { data, error } = await db_default.from("messages").insert({
      room_id: insertMessage.roomId,
      sender_id: insertMessage.userId,
      content: insertMessage.content,
      type: insertMessage.type ?? "user",
      image_url: insertMessage.imageUrl ?? null,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Failed to create message - no data returned");
    return data;
  }
  async deleteMessage(id) {
    const { error } = await db_default.from("messages").delete().eq("id", id);
    if (error) throw error;
  }
  async deleteRoomMessages(roomId) {
    const { error } = await db_default.from("messages").delete().eq("room_id", roomId);
    if (error) throw error;
  }
  async deleteRoom(roomId) {
    const { error } = await db_default.from("rooms").delete().eq("id", roomId);
    if (error) throw error;
  }
  async updateRoomParticipantRole(roomId, userId, role) {
    const { error } = await db_default.from("room_participants").update({ role }).match({ room_id: roomId, user_id: userId });
    if (error) throw error;
  }
};
var storage = new DbStorage();

// shared/schema.ts
import { z } from "zod";
var signupSchema = z.object({
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caract\xE8res"),
  displayName: z.string().optional()
});
var loginSchema = z.object({
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(1, "Le mot de passe est requis")
});
var insertUserSchema = z.object({
  username: z.string(),
  password: z.string().optional(),
  // Pour l'authentification
  displayName: z.string().optional(),
  avatarUrl: z.string().optional().nullable(),
  bio: z.string().optional()
});
var insertRoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  type: z.enum(["public", "private"]).optional(),
  createdById: z.string()
});
var insertRoomParticipantSchema = z.object({
  roomId: z.string(),
  userId: z.string(),
  role: z.enum(["user", "admin"]).optional()
});
var insertMessageSchema = z.object({
  roomId: z.string(),
  userId: z.string(),
  content: z.string(),
  type: z.enum(["user", "system", "image"]).optional(),
  imageUrl: z.string().optional().nullable()
});

// server/user-sync.ts
async function syncUserToCustomTable(authUser) {
  try {
    const { data: existingUser, error: selectError } = await supabase.from("users").select("id").eq("id", authUser.id).single();
    if (selectError && selectError.code !== "PGRST116") {
      console.error("Erreur lors de la v\xE9rification utilisateur:", selectError);
      return false;
    }
    if (!existingUser) {
      const userData = {
        id: authUser.id,
        username: authUser.user_metadata?.username || authUser.email?.split("@")[0] || "user",
        display_name: authUser.user_metadata?.display_name || authUser.user_metadata?.username || "User",
        avatar_url: authUser.user_metadata?.avatar_url || null,
        bio: authUser.user_metadata?.bio || null,
        is_online: false,
        last_seen: (/* @__PURE__ */ new Date()).toISOString(),
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      const { error: insertError } = await supabase.from("users").insert(userData);
      if (insertError) {
        if (insertError.code === "23505" && insertError.message?.includes("username")) {
          console.log("Username d\xE9j\xE0 pris, tentative avec username modifi\xE9...");
          const baseUsername = userData.username.slice(0, 14);
          const uniqueUsername = `${baseUsername}_${Date.now().toString().slice(-6)}`;
          userData.username = uniqueUsername;
          const { error: retryError } = await supabase.from("users").insert(userData);
          if (retryError) {
            console.error("Erreur cr\xE9ation utilisateur avec username modifi\xE9:", retryError);
            return false;
          }
          console.log("\u2705 Utilisateur cr\xE9\xE9 avec username unique:", uniqueUsername);
          return true;
        }
        console.error("Erreur cr\xE9ation utilisateur dans table personnalis\xE9e:", insertError);
        return false;
      }
      console.log("\u2705 Utilisateur synchronis\xE9 vers table personnalis\xE9e:", authUser.id);
      return true;
    }
    console.log("\u2705 Utilisateur existe d\xE9j\xE0 dans table personnalis\xE9e:", authUser.id);
    return true;
  } catch (error) {
    console.error("Erreur synchronisation utilisateur:", error);
    return false;
  }
}

// server/auth.ts
var signUp = async (email, password, username, displayName) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: displayName || username
      },
      emailRedirectTo: void 0
      // Désactiver la redirection email pour le développement
    }
  });
  if (error) {
    console.error("Erreur Supabase signUp:", error);
    throw error;
  }
  console.log("SignUp data:", {
    user: !!data.user,
    session: !!data.session,
    userId: data.user?.id
  });
  return data;
};
var signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
};
var signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
var authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  console.log("Auth middleware - Token re\xE7u:", token ? `${token.substring(0, 20)}...` : "null");
  if (!token) {
    return res.status(401).json({ success: false, message: "Token d'acc\xE8s requis" });
  }
  try {
    if (token.startsWith("temp_token_")) {
      console.log("Token temporaire d\xE9tect\xE9");
      const userId = token.replace("temp_token_", "");
      console.log("UserID extrait:", userId);
      if (!userId || userId === "undefined") {
        return res.status(400).json({ success: false, message: "Token temporaire malform\xE9" });
      }
      const { data: userData, error: error2 } = await supabase.auth.admin.getUserById(userId);
      console.log("R\xE9sultat getUserById:", { user: !!userData?.user, error: !!error2 });
      if (error2 || !userData?.user) {
        console.error("Erreur getUserById:", error2);
        if (error2?.code === "user_not_found") {
          return res.status(401).json({ success: false, message: "Token temporaire expir\xE9 ou invalide. Veuillez vous reconnecter." });
        }
        return res.status(403).json({ success: false, message: "Token temporaire invalide" });
      }
      const user2 = userData.user;
      console.log("Synchronisation utilisateur vers table personnalis\xE9e:", user2.id);
      const syncSuccess2 = await syncUserToCustomTable(user2);
      if (!syncSuccess2) {
        return res.status(500).json({
          success: false,
          message: "Impossible de synchroniser l'utilisateur"
        });
      }
      req.userId = user2.id;
      req.user = {
        id: user2.id,
        username: user2.user_metadata?.username || user2.email?.split("@")[0] || "user",
        displayName: user2.user_metadata?.display_name
      };
      console.log("User d\xE9fini:", { userId: req.userId, username: req.user.username });
      return next();
    }
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(403).json({ success: false, message: "Token invalide ou expir\xE9" });
    }
    const typedUser = user;
    const syncSuccess = await syncUserToCustomTable(typedUser);
    if (!syncSuccess) {
      return res.status(500).json({
        success: false,
        message: "Impossible de synchroniser l'utilisateur"
      });
    }
    req.userId = typedUser.id;
    req.user = {
      id: typedUser.id,
      username: typedUser.user_metadata?.username || typedUser.email?.split("@")[0] || "user",
      displayName: typedUser.user_metadata?.display_name || typedUser.user_metadata?.username || "User",
      email: typedUser.email
    };
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: "Erreur de v\xE9rification du token" });
  }
};

// server/routes.ts
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const connectedClients = /* @__PURE__ */ new Map();
  const authRouter = express.Router();
  authRouter.post("/signup", async (req, res) => {
    try {
      console.log("Donn\xE9es re\xE7ues:", req.body);
      const validatedData = signupSchema.parse(req.body);
      const { email, password, displayName } = validatedData;
      const username = email.split("@")[0];
      const authData = await signUp(email, password, username, displayName);
      console.log("R\xE9sultat signUp:", {
        user: !!authData.user,
        session: !!authData.session,
        userId: authData.user?.id,
        userEmail: authData.user?.email
      });
      if (!authData.user) {
        return res.status(400).json({
          success: false,
          message: "Erreur lors de la cr\xE9ation du compte"
        });
      }
      console.log("Synchronisation utilisateur apr\xE8s signup:", authData.user.id);
      await syncUserToCustomTable(authData.user);
      const token = authData.session?.access_token || "temp_token_" + authData.user.id;
      res.status(201).json({
        success: true,
        token,
        user: {
          id: authData.user.id,
          username: authData.user.user_metadata?.username || username,
          displayName: authData.user.user_metadata?.display_name || displayName || username
        }
      });
    } catch (error) {
      console.error("Erreur signup:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Erreur lors de l'inscription"
      });
    }
  });
  authRouter.post("/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const { email, password } = validatedData;
      const username = email.split("@")[0];
      const authData = await signIn(email, password);
      if (!authData.user || !authData.session) {
        return res.status(401).json({
          success: false,
          message: "Pseudo ou mot de passe incorrect"
        });
      }
      res.json({
        success: true,
        token: authData.session.access_token,
        user: {
          id: authData.user.id,
          username: authData.user.user_metadata?.username || username,
          displayName: authData.user.user_metadata?.display_name || username
        }
      });
    } catch (error) {
      console.error("Erreur login:", error);
      res.status(401).json({
        success: false,
        message: "Pseudo ou mot de passe incorrect"
      });
    }
  });
  authRouter.get("/verify", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Token invalide"
        });
      }
      res.json({
        success: true,
        user: {
          id: req.user.id,
          username: req.user.username,
          displayName: req.user.displayName
        }
      });
    } catch (error) {
      console.error("Erreur verify:", error);
      res.status(500).json({
        success: false,
        message: "Erreur serveur"
      });
    }
  });
  authRouter.post("/logout", authenticateToken, async (req, res) => {
    try {
      await signOut();
      res.json({
        success: true,
        message: "D\xE9connexion r\xE9ussie"
      });
    } catch (error) {
      console.error("Erreur logout:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la d\xE9connexion"
      });
    }
  });
  app2.use("/api/auth", authRouter);
  const usersRouter = express.Router();
  usersRouter.post("/", async (req, res) => {
    try {
      const { username, displayName, avatarUrl, bio } = req.body;
      if (!username) return res.status(400).json({ error: "username required" });
      const newUser = { username, displayName, avatarUrl, bio };
      const user = await storage.createUser(newUser);
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.use("/api/users", usersRouter);
  const roomsRouter = express.Router();
  roomsRouter.post("/", authenticateToken, async (req, res) => {
    try {
      console.log("=== ROOM CREATION ROUTE STARTED ===");
      const { name } = req.body;
      const createdById = req.userId;
      console.log("Cr\xE9ation room - userId:", createdById, "name:", name);
      if (!createdById) return res.status(400).json({ error: "createdById required" });
      console.log("V\xE9rification existence utilisateur pour room creation:", createdById);
      const { data: existingUser, error: userError } = await supabase.from("users").select("id").eq("id", createdById).single();
      console.log("R\xE9sultat v\xE9rification utilisateur room:", { existingUser: !!existingUser, userError: !!userError });
      if (!existingUser || userError) {
        console.log("Utilisateur non trouv\xE9, synchronisation automatique...");
        const { data: authUserData, error: authError } = await supabase.auth.admin.getUserById(createdById);
        if (authError || !authUserData?.user) {
          console.error("Erreur r\xE9cup\xE9ration auth user:", authError);
          return res.status(500).json({ error: "Utilisateur introuvable dans auth.users" });
        }
        const syncSuccess = await syncUserToCustomTable(authUserData.user);
        if (!syncSuccess) {
          return res.status(500).json({ error: "Impossible de synchroniser l'utilisateur" });
        }
        console.log("Utilisateur synchronis\xE9 automatiquement:", createdById);
      }
      const roomId = randomUUID().slice(0, 8).toUpperCase();
      const type = "private";
      const newRoom = {
        id: roomId,
        name,
        type,
        createdById
      };
      const room = await storage.createRoom(newRoom, createdById);
      await storage.addRoomParticipant({
        roomId: room.id,
        userId: createdById,
        role: "admin"
      });
      res.json(room);
    } catch (err) {
      console.error("Erreur cr\xE9ation room:", err);
      res.status(500).json({ error: err.message });
    }
  });
  roomsRouter.get("/", authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const allRooms = await storage.getRooms();
      const userParticipantRooms = await Promise.all(
        allRooms.map(async (room) => {
          const participant = await storage.getRoomParticipant(room.id, userId);
          if (!participant) return null;
          const messages = await storage.getRoomMessages(room.id);
          let lastMessage = null;
          if (messages.length > 0) {
            const latestMessage = messages[messages.length - 1];
            try {
              const senderId = latestMessage.sender_id || latestMessage.userId;
              const author = senderId ? await storage.getUser(senderId) : null;
              lastMessage = {
                content: latestMessage.content,
                timestamp: latestMessage.timestamp,
                senderName: author?.username || author?.displayName || "Utilisateur inconnu",
                senderId
              };
            } catch (error) {
              console.error("Erreur r\xE9cup\xE9ration auteur dernier message:", error);
              lastMessage = {
                content: latestMessage.content,
                timestamp: latestMessage.timestamp,
                senderName: "Utilisateur inconnu",
                senderId: latestMessage.sender_id || latestMessage.userId
              };
            }
          }
          const participants = await storage.getRoomParticipants(room.id);
          const participantCount = participants.length;
          return {
            ...room,
            lastMessage,
            participantCount
          };
        })
      );
      const visibleRooms = userParticipantRooms.filter((room) => room !== null).sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
      });
      res.json(visibleRooms);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  roomsRouter.post("/:roomId/join", authenticateToken, async (req, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.userId;
      const { code } = req.body;
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: "Room non trouv\xE9e" });
      }
      const existingParticipant = await storage.getRoomParticipant(roomId, userId);
      if (existingParticipant) {
        return res.json({ message: "D\xE9j\xE0 participant", participant: existingParticipant });
      }
      if (!code || code !== roomId) {
        return res.status(403).json({ error: "Code d'acc\xE8s invalide" });
      }
      const participant = await storage.addRoomParticipant({
        roomId,
        userId,
        role: "user"
      });
      res.json({ message: "Rejoint avec succ\xE8s", participant, room });
    } catch (err) {
      console.error("Erreur jointure room:", err);
      res.status(500).json({ error: err.message });
    }
  });
  roomsRouter.post("/:roomId/leave", authenticateToken, async (req, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.userId;
      const participant = await storage.getRoomParticipant(roomId, userId);
      if (!participant) {
        return res.status(404).json({ error: "Vous n'\xEAtes pas participant de cette room" });
      }
      const room = await storage.getRoom(roomId);
      if (room && room.createdById === userId) {
        return res.status(403).json({
          error: "Le propri\xE9taire ne peut pas quitter sa propre room. Supprimez la room \xE0 la place."
        });
      }
      await storage.removeRoomParticipant(roomId, userId);
      res.json({ message: "Room quitt\xE9e avec succ\xE8s" });
    } catch (err) {
      console.error("Erreur quitter room:", err);
      res.status(500).json({ error: err.message });
    }
  });
  roomsRouter.get("/:roomId/participants", authenticateToken, async (req, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.userId;
      const userParticipant = await storage.getRoomParticipant(roomId, userId);
      if (!userParticipant) {
        return res.status(403).json({ error: "Vous devez \xEAtre participant pour voir la liste" });
      }
      const participants = await storage.getRoomParticipants(roomId);
      res.json(participants);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  roomsRouter.post("/:roomId/kick/:targetUserId", authenticateToken, async (req, res) => {
    try {
      const { roomId, targetUserId } = req.params;
      const userId = req.userId;
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: "Room non trouv\xE9e" });
      }
      if (room.createdById !== userId) {
        return res.status(403).json({ error: "Seul le propri\xE9taire peut expulser des participants" });
      }
      if (targetUserId === userId) {
        return res.status(400).json({ error: "Vous ne pouvez pas vous expulser vous-m\xEAme" });
      }
      const targetParticipant = await storage.getRoomParticipant(roomId, targetUserId);
      if (!targetParticipant) {
        return res.status(404).json({ error: "Utilisateur non trouv\xE9 dans cette room" });
      }
      await storage.removeRoomParticipant(roomId, targetUserId);
      res.json({ message: "Participant expuls\xE9 avec succ\xE8s" });
    } catch (err) {
      console.error("Erreur expulsion participant:", err);
      res.status(500).json({ error: err.message });
    }
  });
  roomsRouter.get("/:roomId/messages", authenticateToken, async (req, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.userId;
      console.log("GET messages - roomId:", roomId, "userId:", userId);
      if (!userId || userId === "undefined") {
        console.error("UserId invalide dans GET messages:", userId);
        return res.status(400).json({ error: "Utilisateur non authentifi\xE9 correctement" });
      }
      const participant = await storage.getRoomParticipant(roomId, userId);
      if (!participant) {
        return res.status(403).json({ error: "Vous devez \xEAtre participant pour voir les messages" });
      }
      const messages = await storage.getRoomMessages(roomId);
      const enrichedMessages = await Promise.all(
        messages.map(async (message) => {
          try {
            const senderId = message.sender_id || message.userId;
            if (!senderId || senderId === "undefined") {
              console.warn("Message sans sender_id valide:", message.id);
              return {
                ...message,
                senderName: "Utilisateur inconnu",
                senderId: null,
                userId: senderId
                // Pour compatibilité
              };
            }
            const user = await storage.getUser(senderId);
            return {
              ...message,
              senderName: user?.username || user?.displayName || "Utilisateur inconnu",
              senderId,
              userId: senderId
              // Pour compatibilité avec le frontend
            };
          } catch (userError) {
            console.error("Erreur r\xE9cup\xE9ration utilisateur pour message:", message.id, userError);
            return {
              ...message,
              senderName: "Utilisateur inconnu",
              senderId: message.sender_id || message.userId,
              userId: message.sender_id || message.userId
            };
          }
        })
      );
      res.json(enrichedMessages);
    } catch (err) {
      console.error("Erreur GET messages:", err);
      res.status(500).json({ error: err.message });
    }
  });
  roomsRouter.post("/:roomId/messages", authenticateToken, async (req, res) => {
    try {
      const { roomId } = req.params;
      const { content } = req.body;
      const userId = req.userId;
      if (!content) return res.status(400).json({ error: "Content requis" });
      const participant = await storage.getRoomParticipant(roomId, userId);
      if (!participant) {
        return res.status(403).json({ error: "Vous devez \xEAtre participant pour envoyer des messages" });
      }
      const insertMessage = {
        roomId,
        userId,
        content
      };
      const message = await storage.createMessage(insertMessage);
      const enrichedMessage = {
        ...message,
        senderName: req.user?.username || req.user?.displayName || "Utilisateur",
        senderId: userId,
        userId
        // Pour compatibilité frontend
      };
      res.json(enrichedMessage);
    } catch (err) {
      console.error("Erreur cr\xE9ation message:", err);
      res.status(500).json({ error: err.message });
    }
  });
  roomsRouter.post("/:roomId/promote/:targetUserId", authenticateToken, async (req, res) => {
    try {
      const { roomId, targetUserId } = req.params;
      const userId = req.userId;
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: "Room non trouv\xE9e" });
      }
      if (room.createdById !== userId) {
        return res.status(403).json({ error: "Seul le propri\xE9taire peut promouvoir des participants" });
      }
      const targetParticipant = await storage.getRoomParticipant(roomId, targetUserId);
      if (!targetParticipant) {
        return res.status(404).json({ error: "Utilisateur non trouv\xE9 dans cette room" });
      }
      if (targetParticipant.role === "admin") {
        return res.status(400).json({ error: "Cet utilisateur est d\xE9j\xE0 admin" });
      }
      await storage.updateRoomParticipantRole(roomId, targetUserId, "admin");
      res.json({ message: "Participant promu admin avec succ\xE8s" });
    } catch (err) {
      console.error("Erreur promotion participant:", err);
      res.status(500).json({ error: err.message });
    }
  });
  roomsRouter.post("/:roomId/demote/:targetUserId", authenticateToken, async (req, res) => {
    try {
      const { roomId, targetUserId } = req.params;
      const userId = req.userId;
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: "Room non trouv\xE9e" });
      }
      if (room.createdById !== userId) {
        return res.status(403).json({ error: "Seul le propri\xE9taire peut r\xE9trograder des admins" });
      }
      if (targetUserId === userId) {
        return res.status(400).json({ error: "Le propri\xE9taire ne peut pas se r\xE9trograder" });
      }
      const targetParticipant = await storage.getRoomParticipant(roomId, targetUserId);
      if (!targetParticipant) {
        return res.status(404).json({ error: "Utilisateur non trouv\xE9 dans cette room" });
      }
      if (targetParticipant.role !== "admin") {
        return res.status(400).json({ error: "Cet utilisateur n'est pas admin" });
      }
      await storage.updateRoomParticipantRole(roomId, targetUserId, "user");
      res.json({ message: "Admin r\xE9trograd\xE9 avec succ\xE8s" });
    } catch (err) {
      console.error("Erreur r\xE9trogradation participant:", err);
      res.status(500).json({ error: err.message });
    }
  });
  roomsRouter.delete("/:roomId", authenticateToken, async (req, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.userId;
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: "Room non trouv\xE9e" });
      }
      if (room.createdById !== userId) {
        return res.status(403).json({ error: "Seul le propri\xE9taire peut supprimer cette room" });
      }
      const participants = await storage.getRoomParticipants(roomId);
      for (const participant of participants) {
        await storage.removeRoomParticipant(roomId, participant.userId);
      }
      await storage.deleteRoomMessages(roomId);
      await storage.deleteRoom(roomId);
      res.json({ message: "Room supprim\xE9e avec succ\xE8s" });
    } catch (err) {
      console.error("Erreur suppression room:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app2.use("/api/rooms", roomsRouter);
  wss.on("connection", (ws) => {
    let clientId = null;
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        switch (message.type) {
          case "join_room": {
            const { userId, username, roomId } = message;
            clientId = randomUUID();
            connectedClients.set(clientId, { ws, userId, username, roomId });
            break;
          }
          case "broadcast_message": {
            if (!clientId) return;
            const client = connectedClients.get(clientId);
            if (!client) return;
            const newMessage = {
              roomId: client.roomId,
              userId: client.userId,
              content: message.content
            };
            const storedMessage = await storage.createMessage(newMessage);
            const enrichedMessage = {
              ...storedMessage,
              senderName: client.username,
              senderId: client.userId,
              userId: client.userId
            };
            connectedClients.forEach((c) => {
              if (c.roomId === client.roomId && c.ws.readyState === WebSocket.OPEN) {
                c.ws.send(JSON.stringify({ type: "message_received", message: enrichedMessage }));
              }
            });
          }
        }
      } catch (err) {
        console.error(err);
      }
    });
    ws.on("close", () => {
      if (clientId) connectedClients.delete(clientId);
    });
  });
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var vite_config_default = defineConfig({
  root: path.resolve(__dirname, "client"),
  // <-- pointage vers ton dossier client
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    // sortie build finale
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express3();
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const host = "0.0.0.0";
  const port = parseInt(process.env.PORT || "3000", 10);
  console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
  console.log("SUPABASE_SERVICE_KEY:", process.env.SUPABASE_SERVICE_KEY);
  server.listen(port, host, () => {
    log(`Serving on http://${host}:${port}`);
  });
})();
