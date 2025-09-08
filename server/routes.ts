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
        name: req.body.name || `Salle ${roomId}`,
        createdBy: req.body.createdBy || 'system'
      });
      res.json(room);
    } catch (error) {
      console.error('Error creating room:', error);
      res.status(500).json({ error: 'Failed to create room', details: (error as Error).message });
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
      console.error('Error getting room:', error);
      res.status(500).json({ error: 'Failed to get room', details: (error as Error).message });
    }
  });

  // Message routes
  app.get('/api/rooms/:id/messages', async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      
      const messages = await storage.getRoomMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get messages' });
    }
  });

  app.post('/api/rooms/:id/messages', async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const message = await storage.createMessage({
        content: req.body.content,
        senderId: req.body.senderId,
        senderName: req.body.senderName,
        roomId: req.params.id,
        type: req.body.type || 'user',
        imageUrl: req.body.imageUrl
      });
      
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create message' });
    }
  });

  // Join a room - add user as participant
  app.post('/api/rooms/:id/join', async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const userId = req.body.userId;
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // For now, just verify the room exists and user can join
      // In a full implementation, you would add user to room participants
      
      res.json({ success: true, room });
    } catch (error) {
      console.error('Error joining room:', error);
      res.status(500).json({ error: 'Failed to join room' });
    }
  });

  // Get user's rooms with details
  app.get('/api/users/:userId/rooms', async (req, res) => {
    try {
      // For demonstration, return empty array since we removed mock data
      res.json([]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user rooms' });
    }
  });

  // Get public rooms
  app.get('/api/rooms/public', async (req, res) => {
    try {
      res.json([]);
    } catch (error) {
      console.error('Error fetching public rooms:', error);
      res.status(500).json({ error: 'Failed to fetch public rooms' });
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

            // Update user online status
            await storage.updateUserOnlineStatus(user.id, true);

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

            // Broadcast user joined to room with online status
            broadcastToRoom(roomId, {
              type: 'user_joined',
              username,
              userId: user.id,
              role: role || 'user',
              isOnline: true
            }, clientId);

            // Send current online users
            const onlineUsers = Array.from(connectedClients.values())
              .filter(client => client.roomId === roomId)
              .map(client => ({
                userId: client.userId,
                username: client.username,
                isOnline: true
              }));

            ws.send(JSON.stringify({
              type: 'online_users',
              users: onlineUsers
            }));

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
              }, clientId!);
            }
            break;
          }

          case 'broadcast_message': {
            const client = connectedClients.get(clientId!);
            if (client) {
              // Save message to database
              const savedMessage = await storage.createMessage({
                content: message.message.content,
                senderId: client.userId,
                senderName: client.username,
                roomId: client.roomId,
                type: message.message.type || 'user',
                imageUrl: message.message.imageUrl
              });

              broadcastToRoom(client.roomId, {
                type: 'message_received',
                message: {
                  id: savedMessage.id,
                  content: savedMessage.content,
                  senderId: savedMessage.senderId,
                  senderName: savedMessage.senderName,
                  timestamp: savedMessage.timestamp?.getTime() || Date.now(),
                  type: savedMessage.type,
                  imageUrl: savedMessage.imageUrl
                }
              }, clientId!);
            }
            break;
          }

          case 'delete_message': {
            const client = connectedClients.get(clientId!);
            if (client) {
              broadcastToRoom(client.roomId, {
                type: 'delete_message',
                messageId: message.messageId,
                timestamp: Date.now()
              });
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
          // Mark user as offline
          await storage.updateUserOnlineStatus(client.userId, false);
          
          await storage.removeRoomParticipant(client.roomId, client.userId);
          
          // Broadcast user disconnected with offline status
          broadcastToRoom(client.roomId, {
            type: 'user_left',
            username: client.username,
            userId: client.userId,
            isOnline: false
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
