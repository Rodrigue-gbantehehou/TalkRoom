import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { randomUUID } from "crypto";

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  username: string;
  roomId: string;
  role: 'user' | 'admin';
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const connectedClients = new Map<string, ConnectedClient>();

  // API Routes
  app.post('/api/rooms', async (req, res) => {
    try {
      const roomId = randomUUID().slice(0, 8).toUpperCase();
      const room = await storage.createRoom({ 
        id: roomId, 
        name: req.body.name || `Salle ${roomId}` 
      });
      res.json(room);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create room' });
    }
  });

  app.get('/api/rooms/:id', async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      
      const participants = await storage.getRoomParticipants(req.params.id);
      res.json({ ...room, participantCount: participants.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get room' });
    }
  });

  // WebSocket handling
  wss.on('connection', (ws: WebSocket) => {
    let clientId: string | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'join_room': {
            const { username, roomId, role } = message;
            clientId = randomUUID();
            
            // Create user if not exists
            let user = await storage.getUserByUsername(username);
            if (!user) {
              user = await storage.createUser({ username, password: 'temp' });
            }

            // Check if room exists, if not return error
            const room = await storage.getRoom(roomId);
            if (!room) {
              ws.send(JSON.stringify({ type: 'error', message: 'Salle introuvable' }));
              return;
            }

            // Add user to room
            await storage.addRoomParticipant({
              roomId,
              userId: user.id,
              role: role || 'user'
            });

            // Store client connection
            connectedClients.set(clientId, {
              ws,
              userId: user.id,
              username,
              roomId,
              role: role || 'user'
            });

            // Send success response
            ws.send(JSON.stringify({ 
              type: 'joined_room', 
              roomId, 
              userId: user.id,
              username 
            }));

            // Broadcast user joined to room
            broadcastToRoom(roomId, {
              type: 'user_joined',
              username,
              userId: user.id,
              role: role || 'user'
            }, clientId);

            // Send current participants list
            const participants = await getRoomParticipants(roomId);
            ws.send(JSON.stringify({ 
              type: 'participants_update', 
              participants 
            }));

            break;
          }

          case 'leave_room': {
            if (clientId) {
              const client = connectedClients.get(clientId);
              if (client) {
                await storage.removeRoomParticipant(client.roomId, client.userId);
                
                // Broadcast user left
                broadcastToRoom(client.roomId, {
                  type: 'user_left',
                  username: client.username,
                  userId: client.userId
                }, clientId);

                connectedClients.delete(clientId);
              }
            }
            break;
          }

          case 'webrtc_signal': {
            // Forward WebRTC signaling messages to target peer
            const { targetUserId, signal } = message;
            const targetClient = Array.from(connectedClients.values())
              .find(client => client.userId === targetUserId);
            
            if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
              const senderClient = connectedClients.get(clientId!);
              targetClient.ws.send(JSON.stringify({
                type: 'webrtc_signal',
                signal,
                fromUserId: senderClient?.userId,
                fromUsername: senderClient?.username
              }));
            }
            break;
          }

          case 'typing_start':
          case 'typing_stop': {
            const client = connectedClients.get(clientId!);
            if (client) {
              broadcastToRoom(client.roomId, {
                type: message.type,
                username: client.username,
                userId: client.userId
              }, clientId);
            }
            break;
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Erreur du serveur' }));
      }
    });

    ws.on('close', async () => {
      if (clientId) {
        const client = connectedClients.get(clientId);
        if (client) {
          await storage.removeRoomParticipant(client.roomId, client.userId);
          
          // Broadcast user disconnected
          broadcastToRoom(client.roomId, {
            type: 'user_left',
            username: client.username,
            userId: client.userId
          }, clientId);

          connectedClients.delete(clientId);
        }
      }
    });
  });

  async function getRoomParticipants(roomId: string) {
    const participants = await storage.getRoomParticipants(roomId);
    const users = await Promise.all(
      participants.map(async (p) => {
        const user = await storage.getUser(p.userId);
        return user ? {
          id: user.id,
          username: user.username,
          role: p.role,
          isOnline: Array.from(connectedClients.values())
            .some(client => client.userId === user.id && client.roomId === roomId)
        } : null;
      })
    );
    return users.filter(Boolean);
  }

  function broadcastToRoom(roomId: string, message: any, excludeClientId?: string) {
    Array.from(connectedClients.entries()).forEach(([id, client]) => {
      if (client.roomId === roomId && 
          id !== excludeClientId && 
          client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  return httpServer;
}
