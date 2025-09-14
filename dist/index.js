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
      displayname: insertUser.displayName ?? null,
      avatarurl: insertUser.avatarUrl ?? null,
      bio: insertUser.bio ?? null,
      isonline: false,
      lastseen: (/* @__PURE__ */ new Date()).toISOString(),
      createdat: (/* @__PURE__ */ new Date()).toISOString()
    }).select().single();
    if (error) throw error;
    return data;
  }
  async updateUserOnlineStatus(userId, isOnline) {
    const { error } = await db_default.from("users").update({ isonline: isOnline, lastseen: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", userId);
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
      id: insertRoom.id,
      name: insertRoom.name,
      avatarUrl: insertRoom.avatarUrl ?? null,
      description: insertRoom.description ?? null,
      type: insertRoom.type ?? "public",
      owner_id: creatorId,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    }).select().single();
    if (error) throw error;
    return data;
  }
  async getRooms() {
    const { data, error } = await db_default.from("rooms").select("*").order("createdAt", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }
  async deleteRoom(id) {
    await db_default.from("room_participants").delete().eq("roomid", id);
    const { error } = await db_default.from("rooms").delete().eq("id", id);
    if (error) throw error;
  }
  // === PARTICIPANTS ===
  async getRoomParticipants(roomId) {
    const { data, error } = await db_default.from("room_participants").select("*").eq("roomid", roomId);
    if (error) throw error;
    return data ?? [];
  }
  async addRoomParticipant(insertParticipant) {
    const { data, error } = await db_default.from("room_participants").insert({
      roomid: insertParticipant.roomId,
      userid: insertParticipant.userId,
      role: insertParticipant.role ?? "user"
    }).select().single();
    if (error) throw error;
    return data;
  }
  async removeRoomParticipant(roomId, userId) {
    const { error } = await db_default.from("room_participants").delete().match({ roomid: roomId, userid: userId });
    if (error) throw error;
  }
  async getRoomParticipant(roomId, userId) {
    const { data, error } = await db_default.from("room_participants").select("*").match({ roomid: roomId, userid: userId }).single();
    if (error) throw error;
    return data;
  }
  // === MESSAGES ===
  async getRoomMessages(roomId) {
    const { data, error } = await db_default.from("messages").select("*").eq("roomid", roomId).order("timestamp", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }
  async createMessage(insertMessage) {
    const { data, error } = await db_default.from("messages").insert({
      roomid: insertMessage.roomId,
      senderid: insertMessage.userId,
      content: insertMessage.content,
      type: insertMessage.type ?? "user",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }).select().single();
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
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const connectedClients = /* @__PURE__ */ new Map();
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
  roomsRouter.post("/", async (req, res) => {
    try {
      const { name, createdById } = req.body;
      if (!createdById) return res.status(400).json({ error: "createdById required" });
      const roomId = randomUUID().slice(0, 8).toUpperCase();
      const newRoom = { id: roomId, name, createdById };
      const room = await storage.createRoom(newRoom, createdById);
      res.json(room);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  roomsRouter.get("/", async (req, res) => {
    try {
      const rooms = await storage.getRooms();
      res.json(rooms);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.use("/api/rooms", roomsRouter);
  const messagesRouter = express.Router();
  messagesRouter.post("/", async (req, res) => {
    try {
      const { roomId, userId, content } = req.body;
      if (!roomId || !userId || !content) return res.status(400).json({ error: "Missing parameters" });
      const newMessage = { roomId, userId, content };
      const message = await storage.createMessage(newMessage);
      connectedClients.forEach((client) => {
        if (client.roomId === roomId && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({ type: "message_received", message }));
        }
      });
      res.json(message);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  messagesRouter.get("/:roomId", async (req, res) => {
    try {
      const { roomId } = req.params;
      const messages = await storage.getRoomMessages(roomId);
      res.json(messages);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.use("/api/messages", messagesRouter);
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
            connectedClients.forEach((c) => {
              if (c.roomId === client.roomId && c.ws.readyState === WebSocket.OPEN) {
                c.ws.send(JSON.stringify({ type: "message_received", message: storedMessage }));
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
  const host = "127.0.0.1";
  const port = parseInt(process.env.PORT || "8000", 10);
  console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
  console.log("SUPABASE_SERVICE_KEY:", process.env.SUPABASE_SERVICE_KEY);
  server.listen(port, host, () => {
    log(`Serving on http://${host}:${port}`);
  });
})();
