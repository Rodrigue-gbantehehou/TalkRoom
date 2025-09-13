// server/index.ts
import express2 from "express";
import cors from "cors";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

// server/db.ts
import { createClient } from "@supabase/supabase-js";
var supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
var db_default = supabase;

// server/storage.ts
var DbStorage = class {
  // === USERS ===
  async getUser(id) {
    const { data, error } = await db_default.from("users").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  }
  async getUserByUsername(username) {
    const { data, error } = await db_default.from("users").select("*").eq("username", username).single();
    if (error) throw error;
    return data;
  }
  async createUser(insertUser) {
    const { data, error } = await db_default.from("users").insert({
      username: insertUser.username,
      displayName: insertUser.displayName ?? null,
      avatarUrl: insertUser.avatarUrl ?? null,
      bio: insertUser.bio ?? null,
      isOnline: false,
      lastSeen: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }).select().single();
    if (error) throw error;
    return data;
  }
  async updateUserOnlineStatus(userId, isOnline) {
    const { error } = await db_default.from("users").update({ isOnline, lastSeen: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", userId);
    if (error) throw error;
  }
  // === ROOMS ===
  async getRoom(id) {
    const { data, error } = await db_default.from("rooms").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  }
  async createRoom(insertRoom, creatorId) {
    const { data, error } = await db_default.from("rooms").insert({
      ...insertRoom,
      createdBy: creatorId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      isActive: true,
      lastActivity: (/* @__PURE__ */ new Date()).toISOString()
    }).select().single();
    if (error) throw error;
    return data;
  }
  async deleteRoom(id) {
    await db_default.from("room_participants").delete().eq("roomId", id);
    const { error } = await db_default.from("rooms").delete().eq("id", id);
    if (error) throw error;
  }
  // === PARTICIPANTS ===
  async getRoomParticipants(roomId) {
    const { data, error } = await db_default.from("room_participants").select("*").eq("roomId", roomId);
    if (error) throw error;
    return data ?? [];
  }
  async addRoomParticipant(insertParticipant) {
    const { data, error } = await db_default.from("room_participants").insert(insertParticipant).select().single();
    if (error) throw error;
    return data;
  }
  async removeRoomParticipant(roomId, userId) {
    const { error } = await db_default.from("room_participants").delete().match({ roomId, userId });
    if (error) throw error;
  }
  async getRoomParticipant(roomId, userId) {
    const { data, error } = await db_default.from("room_participants").select("*").match({ roomId, userId }).single();
    if (error) throw error;
    return data;
  }
  // === MESSAGES ===
  async getRoomMessages(roomId) {
    const { data, error } = await db_default.from("messages").select("*").eq("roomId", roomId).order("timestamp", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }
  async createMessage(insertMessage) {
    const { data, error } = await db_default.from("messages").insert(insertMessage).select().single();
    if (error) throw error;
    return data;
  }
  async deleteMessage(id) {
    const { error } = await db_default.from("messages").delete().eq("id", id);
    if (error) throw error;
  }
};
var storage = new DbStorage();

// server/routes.ts
import { randomUUID } from "crypto";
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const connectedClients = /* @__PURE__ */ new Map();
  app2.post("/api/rooms", async (req, res) => {
    try {
      const roomId = randomUUID().slice(0, 8).toUpperCase();
      const room = await storage.createRoom({
        id: roomId,
        name: req.body.name || `Salle ${roomId}`,
        createdById: req.body.createdById || "system"
      });
      res.json(room);
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ error: "Failed to create room", details: error.message });
    }
  });
  app2.get("/api/rooms/:id", async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      const participants = await storage.getRoomParticipants(req.params.id);
      res.json({ ...room, participantCount: participants.length });
    } catch (error) {
      console.error("Error getting room:", error);
      res.status(500).json({ error: "Failed to get room", details: error.message });
    }
  });
  app2.get("/api/rooms/:id/messages", async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      const messages = await storage.getRoomMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to get messages" });
    }
  });
  app2.post("/api/rooms/:id/messages", async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      const message = await storage.createMessage({
        content: req.body.content,
        senderId: req.body.senderId,
        senderName: req.body.senderName,
        roomId: req.params.id,
        type: req.body.type || "user",
        imageUrl: req.body.imageUrl
      });
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to create message" });
    }
  });
  app2.post("/api/rooms/:id/join", async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      const userId = req.body.userId;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }
      res.json({ success: true, room });
    } catch (error) {
      console.error("Error joining room:", error);
      res.status(500).json({ error: "Failed to join room" });
    }
  });
  app2.get("/api/users/:userId/rooms", async (req, res) => {
    try {
      res.json([]);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user rooms" });
    }
  });
  app2.get("/api/rooms/public", async (req, res) => {
    try {
      res.json([]);
    } catch (error) {
      console.error("Error fetching public rooms:", error);
      res.status(500).json({ error: "Failed to fetch public rooms" });
    }
  });
  wss.on("connection", (ws) => {
    let clientId = null;
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        switch (message.type) {
          case "join_room": {
            const { username, roomId, role } = message;
            clientId = randomUUID();
            let user = await storage.getUserByUsername(username);
            if (!user) {
              user = await storage.createUser({ username, password: "temp" });
            }
            const room = await storage.getRoom(roomId);
            if (!room) {
              ws.send(JSON.stringify({ type: "error", message: "Salle introuvable" }));
              return;
            }
            await storage.updateUserOnlineStatus(user.id, true);
            await storage.addRoomParticipant({
              roomId,
              userId: user.id,
              role: role || "user"
            });
            connectedClients.set(clientId, {
              ws,
              userId: user.id,
              username,
              roomId,
              role: role || "user"
            });
            ws.send(JSON.stringify({
              type: "joined_room",
              roomId,
              userId: user.id,
              username
            }));
            broadcastToRoom(roomId, {
              type: "user_joined",
              username,
              userId: user.id,
              role: role || "user",
              isOnline: true
            }, clientId);
            const onlineUsers = Array.from(connectedClients.values()).filter((client) => client.roomId === roomId).map((client) => ({
              userId: client.userId,
              username: client.username,
              isOnline: true
            }));
            ws.send(JSON.stringify({
              type: "online_users",
              users: onlineUsers
            }));
            const participants = await getRoomParticipants(roomId);
            ws.send(JSON.stringify({
              type: "participants_update",
              participants
            }));
            break;
          }
          case "leave_room": {
            if (clientId) {
              const client = connectedClients.get(clientId);
              if (client) {
                await storage.removeRoomParticipant(client.roomId, client.userId);
                broadcastToRoom(client.roomId, {
                  type: "user_left",
                  username: client.username,
                  userId: client.userId
                }, clientId);
                connectedClients.delete(clientId);
              }
            }
            break;
          }
          case "webrtc_signal": {
            const { targetUserId, signal } = message;
            const targetClient = Array.from(connectedClients.values()).find((client) => client.userId === targetUserId);
            if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
              const senderClient = connectedClients.get(clientId);
              targetClient.ws.send(JSON.stringify({
                type: "webrtc_signal",
                signal,
                fromUserId: senderClient?.userId,
                fromUsername: senderClient?.username
              }));
            }
            break;
          }
          case "typing_start":
          case "typing_stop": {
            const client = connectedClients.get(clientId);
            if (client) {
              broadcastToRoom(client.roomId, {
                type: message.type,
                username: client.username,
                userId: client.userId
              }, clientId);
            }
            break;
          }
          case "broadcast_message": {
            const client = connectedClients.get(clientId);
            if (client) {
              const savedMessage = await storage.createMessage({
                content: message.message.content,
                senderId: client.userId,
                senderName: client.username,
                roomId: client.roomId,
                type: message.message.type || "user",
                imageUrl: message.message.imageUrl
              });
              broadcastToRoom(client.roomId, {
                type: "message_received",
                message: {
                  id: savedMessage.id,
                  content: savedMessage.content,
                  senderId: savedMessage.senderId,
                  senderName: savedMessage.senderName,
                  timestamp: savedMessage.timestamp?.getTime() || Date.now(),
                  type: savedMessage.type,
                  imageUrl: savedMessage.imageUrl
                }
              }, clientId);
            }
            break;
          }
          case "delete_message": {
            const client = connectedClients.get(clientId);
            if (client) {
              broadcastToRoom(client.roomId, {
                type: "delete_message",
                messageId: message.messageId,
                timestamp: Date.now()
              });
            }
            break;
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        ws.send(JSON.stringify({ type: "error", message: "Erreur du serveur" }));
      }
    });
    ws.on("close", async () => {
      if (clientId) {
        const client = connectedClients.get(clientId);
        if (client) {
          await storage.updateUserOnlineStatus(client.userId, false);
          await storage.removeRoomParticipant(client.roomId, client.userId);
          broadcastToRoom(client.roomId, {
            type: "user_left",
            username: client.username,
            userId: client.userId,
            isOnline: false
          }, clientId);
          connectedClients.delete(clientId);
        }
      }
    });
  });
  async function getRoomParticipants(roomId) {
    const participants = await storage.getRoomParticipants(roomId);
    const users = await Promise.all(
      participants.map(async (p) => {
        const user = await storage.getUser(p.userId);
        return user ? {
          id: user.id,
          username: user.username,
          role: p.role,
          isOnline: Array.from(connectedClients.values()).some((client) => client.userId === user.id && client.roomId === roomId)
        } : null;
      })
    );
    return users.filter(Boolean);
  }
  function broadcastToRoom(roomId, message, excludeClientId) {
    Array.from(connectedClients.entries()).forEach(([id, client]) => {
      if (client.roomId === roomId && id !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }
  return httpServer;
}

// server/index.ts
import "dotenv/config";

// server/vite.ts
import express from "express";
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
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
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
  const host = "127.0.0.1";
  const port = parseInt(process.env.PORT || "8000", 10);
  server.listen(port, host, () => {
    log(`Serving on http://${host}:${port}`);
  });
})();
