import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import express from "express";
import { randomUUID } from "crypto";
import { storage } from "./storage"; // ton DbStorage
import { supabase } from "./db";
import { InsertUser, InsertRoom, InsertRoomParticipant, InsertMessage, signupSchema, loginSchema, type AuthResponse } from "@shared/schema";
import { signUp, signIn, signOut, authenticateToken, type AuthenticatedRequest } from "./auth";
import { syncUserToCustomTable } from "./user-sync";

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

  // ==================== AUTHENTICATION ====================
  const authRouter = express.Router();

  // Inscription avec Supabase Auth
  authRouter.post("/signup", async (req, res) => {
    try {
      console.log('Données reçues:', req.body);
      const validatedData = signupSchema.parse(req.body);
      const { email, password, displayName } = validatedData;

      // Extraire le username de l'email pour les métadonnées
      const username = email.split('@')[0];

      // Inscription avec Supabase Auth
      const authData = await signUp(email, password, username, displayName);
      
      console.log('Résultat signUp:', {
        user: !!authData.user,
        session: !!authData.session,
        userId: authData.user?.id,
        userEmail: authData.user?.email
      });

      if (!authData.user) {
        return res.status(400).json({
          success: false,
          message: "Erreur lors de la création du compte"
        } as AuthResponse);
      }

      // Synchroniser l'utilisateur vers la table personnalisée
      console.log('Synchronisation utilisateur après signup:', authData.user.id);
      await syncUserToCustomTable(authData.user);

      // Générer un token temporaire si pas de session (confirmation email requise)
      const token = authData.session?.access_token || 'temp_token_' + authData.user.id;

      res.status(201).json({
        success: true,
        token: token,
        user: {
          id: authData.user.id,
          username: authData.user.user_metadata?.username || username,
          displayName: authData.user.user_metadata?.display_name || displayName || username
        }
      } as AuthResponse);

    } catch (error: any) {
      console.error('Erreur signup:', error);
      res.status(400).json({
        success: false,
        message: error.message || "Erreur lors de l'inscription"
      } as AuthResponse);
    }
  });

  // Connexion avec Supabase Auth
  authRouter.post("/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const { email, password } = validatedData;

      // Extraire le username de l'email pour les métadonnées
      const username = email.split('@')[0];

      // Connexion avec Supabase Auth
      const authData = await signIn(email, password);

      if (!authData.user || !authData.session) {
        return res.status(401).json({
          success: false,
          message: "Pseudo ou mot de passe incorrect"
        } as AuthResponse);
      }

      res.json({
        success: true,
        token: authData.session.access_token,
        user: {
          id: authData.user.id,
          username: authData.user.user_metadata?.username || username,
          displayName: authData.user.user_metadata?.display_name || username
        }
      } as AuthResponse);

    } catch (error: any) {
      console.error('Erreur login:', error);
      res.status(401).json({
        success: false,
        message: "Pseudo ou mot de passe incorrect"
      } as AuthResponse);
    }
  });

  // Vérification du token avec Supabase Auth
  authRouter.get("/verify", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Token invalide"
        } as AuthResponse);
      }

      res.json({
        success: true,
        user: {
          id: req.user.id,
          username: req.user.username,
          displayName: req.user.displayName
        }
      } as AuthResponse);

    } catch (error: any) {
      console.error('Erreur verify:', error);
      res.status(500).json({
        success: false,
        message: "Erreur serveur"
      } as AuthResponse);
    }
  });

  // Déconnexion avec Supabase Auth
  authRouter.post("/logout", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Déconnexion Supabase
      await signOut();

      res.json({
        success: true,
        message: "Déconnexion réussie"
      } as AuthResponse);

    } catch (error: any) {
      console.error('Erreur logout:', error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la déconnexion"
      } as AuthResponse);
    }
  });

  app.use("/api/auth", authRouter);

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

  roomsRouter.post("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      console.log('=== ROOM CREATION ROUTE STARTED ===');
      const { name } = req.body;
      const createdById = req.userId; // Utiliser l'ID du middleware d'authentification
      
      console.log('Création room - userId:', createdById, 'name:', name);
      
      if (!createdById) return res.status(400).json({ error: "createdById required" });

      // Vérifier que l'utilisateur existe en base avant de créer la room
      console.log('Vérification existence utilisateur pour room creation:', createdById);
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', createdById)
        .single();

      console.log('Résultat vérification utilisateur room:', { existingUser: !!existingUser, userError: !!userError });

      if (!existingUser || userError) {
        console.log('Utilisateur non trouvé, synchronisation automatique...');
        // Récupérer l'utilisateur depuis auth.users et le synchroniser
        const { data: authUserData, error: authError } = await supabase.auth.admin.getUserById(createdById);
        
        if (authError || !authUserData?.user) {
          console.error('Erreur récupération auth user:', authError);
          return res.status(500).json({ error: "Utilisateur introuvable dans auth.users" });
        }
        
        const syncSuccess = await syncUserToCustomTable(authUserData.user);
        if (!syncSuccess) {
          return res.status(500).json({ error: "Impossible de synchroniser l'utilisateur" });
        }
        
        console.log('Utilisateur synchronisé automatiquement:', createdById);
      }

      const roomId = randomUUID().slice(0, 8).toUpperCase();
      // Toutes les rooms sont maintenant privées par défaut
      const type = 'private';
      
      const newRoom: InsertRoom = {
        id: roomId,
        name,
        type,
        createdById
      };
      const room = await storage.createRoom(newRoom, createdById);
      
      // Ajouter automatiquement le créateur comme participant admin
      await storage.addRoomParticipant({
        roomId: room.id,
        userId: createdById,
        role: 'admin'
      });
      
      res.json(room);
    } catch (err: any) {
      console.error('Erreur création room:', err);
      res.status(500).json({ error: err.message });
    }
  });

  roomsRouter.get("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const allRooms = await storage.getRooms();
      
      // Toutes les rooms sont privées - ne montrer que celles où l'utilisateur est participant
      const userParticipantRooms = await Promise.all(
        allRooms.map(async (room) => {
          // Vérifier si l'utilisateur est participant de cette room privée
          const participant = await storage.getRoomParticipant(room.id, userId);
          if (!participant) return null;
          
          // Récupérer le dernier message de la room
          const messages = await storage.getRoomMessages(room.id);
          let lastMessage = null;
          
          if (messages.length > 0) {
            const latestMessage = messages[messages.length - 1];
            try {
              // Récupérer l'auteur du dernier message
              const senderId = latestMessage.sender_id || latestMessage.userId;
              const author = senderId ? await storage.getUser(senderId) : null;
              
              lastMessage = {
                content: latestMessage.content,
                timestamp: latestMessage.timestamp,
                senderName: author?.username || author?.displayName || 'Utilisateur inconnu',
                senderId: senderId
              };
            } catch (error) {
              console.error('Erreur récupération auteur dernier message:', error);
              lastMessage = {
                content: latestMessage.content,
                timestamp: latestMessage.timestamp,
                senderName: 'Utilisateur inconnu',
                senderId: latestMessage.sender_id || latestMessage.userId
              };
            }
          }
          
          // Récupérer le nombre exact de participants
          const participants = await storage.getRoomParticipants(room.id);
          const participantCount = participants.length;
          
          return {
            ...room,
            lastMessage,
            participantCount
          };
        })
      );
      
      // Filtrer les null values et trier par dernier message
      const visibleRooms = userParticipantRooms
        .filter(room => room !== null)
        .sort((a, b) => {
          // Trier par timestamp du dernier message (plus récent en premier)
          if (!a.lastMessage && !b.lastMessage) return 0;
          if (!a.lastMessage) return 1;
          if (!b.lastMessage) return -1;
          return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
        });
        
      res.json(visibleRooms);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Rejoindre une room
  roomsRouter.post("/:roomId/join", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.userId!;
      const { code } = req.body; // Pour les rooms privées
      
      // Vérifier que la room existe
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: "Room non trouvée" });
      }
      
      // Vérifier si l'utilisateur est déjà participant
      const existingParticipant = await storage.getRoomParticipant(roomId, userId);
      if (existingParticipant) {
        return res.json({ message: "Déjà participant", participant: existingParticipant });
      }
      
      // Toutes les rooms sont privées - vérifier le code d'accès
      if (!code || code !== roomId) {
        return res.status(403).json({ error: "Code d'accès invalide" });
      }
      
      // Ajouter l'utilisateur comme participant
      const participant = await storage.addRoomParticipant({
        roomId,
        userId,
        role: 'user'
      });
      
      res.json({ message: "Rejoint avec succès", participant, room });
    } catch (err: any) {
      console.error('Erreur jointure room:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Quitter une room
  roomsRouter.post("/:roomId/leave", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.userId!;
      
      const participant = await storage.getRoomParticipant(roomId, userId);
      if (!participant) {
        return res.status(404).json({ error: "Vous n'êtes pas participant de cette room" });
      }
      
      // Vérifier si l'utilisateur est le créateur/propriétaire
      const room = await storage.getRoom(roomId);
      if (room && room.createdById === userId) {
        return res.status(403).json({ 
          error: "Le propriétaire ne peut pas quitter sa propre room. Supprimez la room à la place." 
        });
      }
      
      await storage.removeRoomParticipant(roomId, userId);
      res.json({ message: "Room quittée avec succès" });
    } catch (err: any) {
      console.error('Erreur quitter room:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Obtenir les participants d'une room
  roomsRouter.get("/:roomId/participants", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.userId!;
      
      // Vérifier que l'utilisateur est participant de la room
      const userParticipant = await storage.getRoomParticipant(roomId, userId);
      if (!userParticipant) {
        return res.status(403).json({ error: "Vous devez être participant pour voir la liste" });
      }
      
      const participants = await storage.getRoomParticipants(roomId);
      res.json(participants);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Expulser un participant (seulement le propriétaire)
  roomsRouter.post("/:roomId/kick/:targetUserId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { roomId, targetUserId } = req.params;
      const userId = req.userId!;
      
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: "Room non trouvée" });
      }
      
      // Seul le propriétaire peut expulser
      if (room.createdById !== userId) {
        return res.status(403).json({ error: "Seul le propriétaire peut expulser des participants" });
      }
      
      // Ne peut pas s'expulser soi-même
      if (targetUserId === userId) {
        return res.status(400).json({ error: "Vous ne pouvez pas vous expulser vous-même" });
      }
      
      const targetParticipant = await storage.getRoomParticipant(roomId, targetUserId);
      if (!targetParticipant) {
        return res.status(404).json({ error: "Utilisateur non trouvé dans cette room" });
      }
      
      await storage.removeRoomParticipant(roomId, targetUserId);
      res.json({ message: "Participant expulsé avec succès" });
    } catch (err: any) {
      console.error('Erreur expulsion participant:', err);
      res.status(500).json({ error: err.message });
    }
  });

  roomsRouter.get("/:roomId/messages", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.userId!;
      
      console.log('GET messages - roomId:', roomId, 'userId:', userId);
      
      // Vérifier que userId est valide
      if (!userId || userId === 'undefined') {
        console.error('UserId invalide dans GET messages:', userId);
        return res.status(400).json({ error: "Utilisateur non authentifié correctement" });
      }
      
      // Vérifier que l'utilisateur est participant de la room
      const participant = await storage.getRoomParticipant(roomId, userId);
      if (!participant) {
        return res.status(403).json({ error: "Vous devez être participant pour voir les messages" });
      }
      
      const messages = await storage.getRoomMessages(roomId);
      
      // Enrichir les messages avec les noms d'utilisateur
      const enrichedMessages = await Promise.all(
        messages.map(async (message) => {
          try {
            // Utiliser sender_id qui est le vrai nom du champ en base
            const senderId = message.sender_id || message.userId;
            if (!senderId || senderId === 'undefined') {
              console.warn('Message sans sender_id valide:', message.id);
              return {
                ...message,
                senderName: 'Utilisateur inconnu',
                senderId: null,
                userId: senderId // Pour compatibilité
              };
            }
            
            const user = await storage.getUser(senderId);
            return {
              ...message,
              senderName: user?.username || user?.displayName || 'Utilisateur inconnu',
              senderId: senderId,
              userId: senderId // Pour compatibilité avec le frontend
            };
          } catch (userError) {
            console.error('Erreur récupération utilisateur pour message:', message.id, userError);
            return {
              ...message,
              senderName: 'Utilisateur inconnu',
              senderId: message.sender_id || message.userId,
              userId: message.sender_id || message.userId
            };
          }
        })
      );
      
      res.json(enrichedMessages);
    } catch (err: any) {
      console.error('Erreur GET messages:', err);
      res.status(500).json({ error: err.message });
    }
  });

  roomsRouter.post("/:roomId/messages", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { roomId } = req.params;
      const { content } = req.body;
      const userId = req.userId!;
      
      if (!content) return res.status(400).json({ error: "Content requis" });

      // Vérifier que l'utilisateur est participant de la room
      const participant = await storage.getRoomParticipant(roomId, userId);
      if (!participant) {
        return res.status(403).json({ error: "Vous devez être participant pour envoyer des messages" });
      }

      const insertMessage: InsertMessage = {
        roomId,
        userId,
        content,
      };

      const message = await storage.createMessage(insertMessage);
      
      // Enrichir le message avec les informations utilisateur
      const enrichedMessage = {
        ...message,
        senderName: req.user?.username || req.user?.displayName || 'Utilisateur',
        senderId: userId,
        userId: userId // Pour compatibilité frontend
      };
      
      res.json(enrichedMessage);
    } catch (err: any) {
      console.error('Erreur création message:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Promouvoir un participant au rôle d'admin (seulement le propriétaire)
  roomsRouter.post("/:roomId/promote/:targetUserId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { roomId, targetUserId } = req.params;
      const userId = req.userId!;
      
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: "Room non trouvée" });
      }
      
      // Seul le propriétaire peut promouvoir
      if (room.createdById !== userId) {
        return res.status(403).json({ error: "Seul le propriétaire peut promouvoir des participants" });
      }
      
      const targetParticipant = await storage.getRoomParticipant(roomId, targetUserId);
      if (!targetParticipant) {
        return res.status(404).json({ error: "Utilisateur non trouvé dans cette room" });
      }
      
      if (targetParticipant.role === 'admin') {
        return res.status(400).json({ error: "Cet utilisateur est déjà admin" });
      }
      
      // Mettre à jour le rôle
      await storage.updateRoomParticipantRole(roomId, targetUserId, 'admin');
      res.json({ message: "Participant promu admin avec succès" });
    } catch (err: any) {
      console.error('Erreur promotion participant:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Rétrograder un admin au rôle d'utilisateur (seulement le propriétaire)
  roomsRouter.post("/:roomId/demote/:targetUserId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { roomId, targetUserId } = req.params;
      const userId = req.userId!;
      
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: "Room non trouvée" });
      }
      
      // Seul le propriétaire peut rétrograder
      if (room.createdById !== userId) {
        return res.status(403).json({ error: "Seul le propriétaire peut rétrograder des admins" });
      }
      
      // Ne peut pas se rétrograder soi-même
      if (targetUserId === userId) {
        return res.status(400).json({ error: "Le propriétaire ne peut pas se rétrograder" });
      }
      
      const targetParticipant = await storage.getRoomParticipant(roomId, targetUserId);
      if (!targetParticipant) {
        return res.status(404).json({ error: "Utilisateur non trouvé dans cette room" });
      }
      
      if (targetParticipant.role !== 'admin') {
        return res.status(400).json({ error: "Cet utilisateur n'est pas admin" });
      }
      
      // Mettre à jour le rôle
      await storage.updateRoomParticipantRole(roomId, targetUserId, 'user');
      res.json({ message: "Admin rétrogradé avec succès" });
    } catch (err: any) {
      console.error('Erreur rétrogradation participant:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Supprimer une room (seulement le propriétaire)
  roomsRouter.delete("/:roomId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.userId!;
      
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: "Room non trouvée" });
      }
      
      // Seul le propriétaire peut supprimer la room
      if (room.createdById !== userId) {
        return res.status(403).json({ error: "Seul le propriétaire peut supprimer cette room" });
      }
      
      // Supprimer tous les participants
      const participants = await storage.getRoomParticipants(roomId);
      for (const participant of participants) {
        await storage.removeRoomParticipant(roomId, participant.userId);
      }
      
      // Supprimer tous les messages
      await storage.deleteRoomMessages(roomId);
      
      // Supprimer la room
      await storage.deleteRoom(roomId);
      
      res.json({ message: "Room supprimée avec succès" });
    } catch (err: any) {
      console.error('Erreur suppression room:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.use("/api/rooms", roomsRouter);

  // Routes messages supprimées - maintenant intégrées dans roomsRouter

  // ==================== WEBSOCKET ====================
  wss.on("connection", async (ws: WebSocket, req) => {
    let clientId: string | null = null;
    // Authentifier via token de requête ?token=...
    let authedUserId: string | null = null;
    let authedUsername: string | null = null;

    try {
      const url = new URL(req.url || "", "http://localhost");
      const token = url.searchParams.get("token");

      if (!token) {
        ws.close(1008, "Token requis");
        return;
      }

      if (token.startsWith('temp_token_')) {
        const userId = token.replace('temp_token_', '');
        const { data: userData, error } = await supabase.auth.admin.getUserById(userId);
        if (error || !userData?.user) {
          ws.close(1008, "Token temporaire invalide");
          return;
        }
        authedUserId = userData.user.id;
        authedUsername = (userData.user.user_metadata as any)?.username || userData.user.email?.split('@')[0] || 'user';
      } else {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
          ws.close(1008, "Token invalide");
          return;
        }
        authedUserId = user.id;
        authedUsername = (user.user_metadata as any)?.username || user.email?.split('@')[0] || 'user';
      }
    } catch (err) {
      ws.close(1011, "Erreur d'authentification");
      return;
    }

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case "join_room": {
            const { roomId } = message;
            clientId = randomUUID();
            // Toujours utiliser l'identité authentifiée côté serveur
            connectedClients.set(clientId, { ws, userId: authedUserId!, username: authedUsername!, roomId });
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

            // Enrichir le message avec le nom d'utilisateur pour WebSocket
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
