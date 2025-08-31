// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  users;
  rooms;
  roomParticipants;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.rooms = /* @__PURE__ */ new Map();
    this.roomParticipants = /* @__PURE__ */ new Map();
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  async getRoom(id) {
    return this.rooms.get(id);
  }
  async createRoom(insertRoom) {
    const room = {
      ...insertRoom,
      name: insertRoom.name || null,
      createdAt: /* @__PURE__ */ new Date(),
      isActive: true
    };
    this.rooms.set(room.id, room);
    return room;
  }
  async deleteRoom(id) {
    this.rooms.delete(id);
    Array.from(this.roomParticipants.keys()).filter((key) => this.roomParticipants.get(key)?.roomId === id).forEach((key) => this.roomParticipants.delete(key));
  }
  async getRoomParticipants(roomId) {
    return Array.from(this.roomParticipants.values()).filter(
      (participant) => participant.roomId === roomId
    );
  }
  async addRoomParticipant(insertParticipant) {
    const id = randomUUID();
    const participant = {
      ...insertParticipant,
      id,
      role: insertParticipant.role || "user",
      joinedAt: /* @__PURE__ */ new Date()
    };
    this.roomParticipants.set(id, participant);
    return participant;
  }
  async removeRoomParticipant(roomId, userId) {
    const participantKey = Array.from(this.roomParticipants.keys()).find((key) => {
      const participant = this.roomParticipants.get(key);
      return participant?.roomId === roomId && participant?.userId === userId;
    });
    if (participantKey) {
      this.roomParticipants.delete(participantKey);
    }
  }
  async getRoomParticipant(roomId, userId) {
    return Array.from(this.roomParticipants.values()).find(
      (participant) => participant.roomId === roomId && participant.userId === userId
    );
  }
};
var storage = new MemStorage();

// server/routes.ts
import { randomUUID as randomUUID2 } from "crypto";
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const connectedClients = /* @__PURE__ */ new Map();
  app2.post("/api/rooms", async (req, res) => {
    try {
      const roomId = randomUUID2().slice(0, 8).toUpperCase();
      const room = await storage.createRoom({
        id: roomId,
        name: req.body.name || `Salle ${roomId}`
      });
      res.json(room);
    } catch (error) {
      res.status(500).json({ error: "Failed to create room" });
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
      res.status(500).json({ error: "Failed to get room" });
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
            clientId = randomUUID2();
            let user = await storage.getUserByUsername(username);
            if (!user) {
              user = await storage.createUser({ username, password: "temp" });
            }
            const room = await storage.getRoom(roomId);
            if (!room) {
              ws.send(JSON.stringify({ type: "error", message: "Salle introuvable" }));
              return;
            }
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
              role: role || "user"
            }, clientId);
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
              broadcastToRoom(client.roomId, {
                type: "message_received",
                message: message.message
              }, clientId);
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
          await storage.removeRoomParticipant(client.roomId, client.userId);
          broadcastToRoom(client.roomId, {
            type: "user_left",
            username: client.username,
            userId: client.userId
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

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
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
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
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
  const port = parseInt(process.env.PORT || "4000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${host}`);
  });
})();
