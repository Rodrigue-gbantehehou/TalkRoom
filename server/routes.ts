import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import express from "express";
import { randomUUID } from "crypto";
import { storage } from "./storage"; // ton DbStorage
import { InsertUser, InsertRoom, InsertRoomParticipant, InsertMessage } from "@shared/schema";

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  username: string;
  roomId: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const connectedClients = new Map<string, ConnectedClient>();

  // ==================== USERS ====================
  const usersRouter = express.Router();

  usersRouter.post("/", async (req, res) => {
    try {
      const { username, displayName, avatarUrl, bio } = req.body;
      if (!username) return res.status(400).json({ error: "username required" });

      const newUser: InsertUser = { username, displayName, avatarUrl, bio };
      const user = await storage.createUser(newUser);
      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.use("/api/users", usersRouter);

  // ==================== ROOMS ====================
  const roomsRouter = express.Router();

  roomsRouter.post("/", async (req, res) => {
    try {
      const { name, createdById } = req.body;
      if (!createdById) return res.status(400).json({ error: "createdById required" });

      const roomId = randomUUID().slice(0, 8).toUpperCase();
      const newRoom: InsertRoom = { id: roomId, name, createdById };
      const room = await storage.createRoom(newRoom, createdById);
      res.json(room);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  roomsRouter.get("/", async (req, res) => {
    try {
      const rooms = await storage.getRooms();
      res.json(rooms);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
  app.use("/api/rooms", roomsRouter);

  // ==================== MESSAGES ====================
  const messagesRouter = express.Router();

  messagesRouter.post("/", async (req, res) => {
    try {
      const { roomId, userId, content } = req.body;
      if (!roomId || !userId || !content) return res.status(400).json({ error: "Missing parameters" });

      const newMessage: InsertMessage = { roomId, userId, content };
      const message = await storage.createMessage(newMessage);

      // Diffuser via WebSocket
      connectedClients.forEach((client) => {
        if (client.roomId === roomId && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({ type: "message_received", message }));
        }
      });

      res.json(message);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  messagesRouter.get("/:roomId", async (req, res) => {
    try {
      const { roomId } = req.params;
      const messages = await storage.getRoomMessages(roomId);
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.use("/api/messages", messagesRouter);

  // ==================== WEBSOCKET ====================
  wss.on("connection", (ws: WebSocket) => {
    let clientId: string | null = null;

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

            const newMessage: InsertMessage = {
              roomId: client.roomId,
              userId: client.userId,
              content: message.content,
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
