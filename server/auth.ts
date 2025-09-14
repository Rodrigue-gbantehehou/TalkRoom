import { Request, Response, NextFunction } from 'express';
import { supabase } from './db';
import { User } from '@supabase/supabase-js';
import { syncUserToCustomTable } from './user-sync';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    email?: string;
  };
}

// Inscription avec Supabase Auth
export const signUp = async (email: string, password: string, username: string, displayName?: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: displayName || username
      },
      emailRedirectTo: undefined // Désactiver la redirection email pour le développement
    }
  });

  if (error) {
    console.error('Erreur Supabase signUp:', error);
    throw error;
  }
  
  console.log('SignUp data:', {
    user: !!data.user,
    session: !!data.session,
    userId: data.user?.id
  });
  
  return data;
};

// Connexion avec Supabase Auth
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
};

// Déconnexion
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Middleware d'authentification avec Supabase
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log('Auth middleware - Token reçu:', token ? `${token.substring(0, 20)}...` : 'null');

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token d\'accès requis' });
  }

  try {
    // Gérer les tokens temporaires pour les nouveaux comptes
    if (token.startsWith('temp_token_')) {
      console.log('Token temporaire détecté');
      const userId = token.replace('temp_token_', '');
      console.log('UserID extrait:', userId);
      
      // Vérifier que l'userId est valide (pas undefined)
      if (!userId || userId === 'undefined') {
        return res.status(400).json({ success: false, message: 'Token temporaire malformé' });
      }
      
      // Récupérer l'utilisateur directement depuis Supabase avec l'ID
      const { data: userData, error } = await supabase.auth.admin.getUserById(userId);
      
      console.log('Résultat getUserById:', { user: !!userData?.user, error: !!error });
      
      if (error || !userData?.user) {
        console.error('Erreur getUserById:', error);
        if (error?.code === 'user_not_found') {
          return res.status(401).json({ success: false, message: 'Token temporaire expiré ou invalide. Veuillez vous reconnecter.' });
        }
        return res.status(403).json({ success: false, message: 'Token temporaire invalide' });
      }
      
      const user = userData.user as User;
      
      // Synchroniser l'utilisateur vers la table personnalisée
      console.log('Synchronisation utilisateur vers table personnalisée:', user.id);
      const syncSuccess = await syncUserToCustomTable(user);
      
      if (!syncSuccess) {
        return res.status(500).json({ 
          success: false, 
          message: 'Impossible de synchroniser l\'utilisateur' 
        });
      }
      
      req.userId = user.id;
      req.user = {
        id: user.id,
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
        displayName: user.user_metadata?.display_name
      };
      
      console.log('User défini:', { userId: req.userId, username: req.user.username });
      return next();
    }
    
    // Validation normale pour les vrais tokens JWT
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(403).json({ success: false, message: 'Token invalide ou expiré' });
    }

    const typedUser = user as User;
    
    // Synchroniser l'utilisateur vers la table personnalisée
    const syncSuccess = await syncUserToCustomTable(typedUser);
    
    if (!syncSuccess) {
      return res.status(500).json({ 
        success: false, 
        message: 'Impossible de synchroniser l\'utilisateur' 
      });
    }
    
    req.userId = typedUser.id;
    req.user = {
      id: typedUser.id,
      username: typedUser.user_metadata?.username || typedUser.email?.split('@')[0] || 'user',
      displayName: typedUser.user_metadata?.display_name || typedUser.user_metadata?.username || 'User',
      email: typedUser.email
    };

    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Erreur de vérification du token' });
  }
};

// Middleware optionnel (ne bloque pas si pas de token)
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        const typedUser = user as User;
        req.userId = typedUser.id;
        req.user = {
          id: typedUser.id,
          username: typedUser.user_metadata?.username || typedUser.email?.split('@')[0] || 'user',
          displayName: typedUser.user_metadata?.display_name || typedUser.user_metadata?.username || 'User',
          email: typedUser.email
        };
      }
    } catch (error) {
      // Ignore les erreurs pour le middleware optionnel
    }
  }

  next();
};
