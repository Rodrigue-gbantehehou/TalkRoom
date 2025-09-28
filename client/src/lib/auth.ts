import { SignupRequest, LoginRequest, AuthResponse } from '@shared/schema';
import { z } from 'zod';
import { API_URL } from '@/config';

// Configuration de l'API
const API_BASE = `${API_URL}/api/auth`;

class AuthStorage {
  private readonly TOKEN_KEY = 'talkroom_token';
  private readonly USER_KEY = 'talkroom_user';

  // Stocker le token dans localStorage
  setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  // Récupérer le token
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // Supprimer le token
  removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  // Stocker les données utilisateur
  setUser(user: { id: string; username: string; displayName: string }): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  // Récupérer les données utilisateur
  getUser(): { id: string; username: string; displayName: string } | null {
    if (typeof window === 'undefined') return null;
    
    const userData = localStorage.getItem(this.USER_KEY);
    if (!userData) return null;
    
    try {
      return JSON.parse(userData);
    } catch {
      return null;
    }
  }

  // Supprimer les données utilisateur
  removeUser(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.USER_KEY);
    }
  }

  // Nettoyer tout
  clear(): void {
    this.removeToken();
    this.removeUser();
  }
}

export const authStorage = new AuthStorage();

class AuthService {
  // Inscription
  async signup(data: SignupRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result: AuthResponse = await response.json();
    
    if (result.success && result.token && result.user) {
      authStorage.setToken(result.token);
      authStorage.setUser(result.user);
    }

    return result;
  }

  // Connexion
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result: AuthResponse = await response.json();
    
    if (result.success && result.token && result.user) {
      authStorage.setToken(result.token);
      authStorage.setUser(result.user);
    }

    return result;
  }

  // Vérifier le token
  async verifyToken(): Promise<AuthResponse> {
    const token = authStorage.getToken();
    if (!token) {
      return { success: false, message: 'Aucun token trouvé' };
    }

    const response = await fetch(`${API_BASE}/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const result: AuthResponse = await response.json();
    
    if (result.success && result.user) {
      authStorage.setUser(result.user);
    } else {
      // Token invalide, nettoyer le stockage
      authStorage.clear();
    }

    return result;
  }

  // Déconnexion
  async logout(): Promise<AuthResponse> {
    const token = authStorage.getToken();
    
    if (token) {
      try {
        await fetch(`${API_BASE}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
      }
    }

    // Nettoyer le stockage local dans tous les cas
    authStorage.clear();
    
    return { success: true, message: 'Déconnexion réussie' };
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated(): boolean {
    return !!authStorage.getToken() && !!authStorage.getUser();
  }

  // Récupérer l'utilisateur actuel
  getCurrentUser(): { id: string; username: string; displayName: string } | null {
    return authStorage.getUser();
  }

  // Récupérer le token pour les requêtes API
  getAuthHeaders(): Record<string, string> {
    const token = authStorage.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // Exposer le token (utile pour WebSocket)
  getToken(): string | null {
    return authStorage.getToken();
  }
}

export const authService = new AuthService();
