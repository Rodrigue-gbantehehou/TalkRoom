import { supabase } from './db';

/**
 * Synchronise un utilisateur de auth.users vers la table users personnalisée
 */
export async function syncUserToCustomTable(authUser: any) {
  try {
    // Vérifier si l'utilisateur existe déjà dans la table personnalisée
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Erreur lors de la vérification utilisateur:', selectError);
      return false;
    }

    if (!existingUser) {
      // Créer l'utilisateur dans la table personnalisée
      const userData = {
        id: authUser.id,
        username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'user',
        display_name: authUser.user_metadata?.display_name || authUser.user_metadata?.username || 'User',
        avatar_url: authUser.user_metadata?.avatar_url || null,
        bio: authUser.user_metadata?.bio || null,
        is_online: false,
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('users')
        .insert(userData);

      if (insertError) {
        // Si c'est une erreur de duplication de username, essayer avec un username modifié
        if (insertError.code === '23505' && insertError.message?.includes('username')) {
          console.log('Username déjà pris, tentative avec username modifié...');
          
          // Générer un username unique en tronquant et ajoutant un timestamp court
          const baseUsername = userData.username.slice(0, 14); // Limite à 14 caractères
          const uniqueUsername = `${baseUsername}_${Date.now().toString().slice(-6)}`;
          userData.username = uniqueUsername;
          
          const { error: retryError } = await supabase
            .from('users')
            .insert(userData);
            
          if (retryError) {
            console.error('Erreur création utilisateur avec username modifié:', retryError);
            return false;
          }
          
          console.log('✅ Utilisateur créé avec username unique:', uniqueUsername);
          return true;
        }
        
        console.error('Erreur création utilisateur dans table personnalisée:', insertError);
        return false;
      }

      console.log('✅ Utilisateur synchronisé vers table personnalisée:', authUser.id);
      return true;
    }

    console.log('✅ Utilisateur existe déjà dans table personnalisée:', authUser.id);
    return true;
  } catch (error) {
    console.error('Erreur synchronisation utilisateur:', error);
    return false;
  }
}

/**
 * Met à jour les informations utilisateur dans la table personnalisée
 */
export async function updateCustomUserData(userId: string, updates: {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  is_online?: boolean;
}) {
  try {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('Erreur mise à jour utilisateur personnalisé:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur mise à jour utilisateur:', error);
    return false;
  }
}

/**
 * Récupère les données utilisateur depuis la table personnalisée
 */
export async function getCustomUserData(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erreur récupération utilisateur personnalisé:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    return null;
  }
}
