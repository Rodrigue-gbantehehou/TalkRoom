-- Script minimal pour désactiver RLS sur toutes les tables TalkRoom
-- Exécuter dans l'éditeur SQL de Supabase

-- Désactiver RLS sur toutes les tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- Accorder toutes les permissions aux rôles anon et authenticated
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.rooms TO anon, authenticated;
GRANT ALL ON public.room_participants TO anon, authenticated;
GRANT ALL ON public.messages TO anon, authenticated;

-- Vérifier que RLS est bien désactivé
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'rooms', 'room_participants', 'messages');
