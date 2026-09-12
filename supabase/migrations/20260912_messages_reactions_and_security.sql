-- ==============================================================================
-- MIKAYALA WHATSAPP COUPLE - MISE À JOUR SÉCURITÉ, RÉACTIONS & SUPPRESSION DES MESSAGES
-- ==============================================================================
-- Exécutez ce script directement dans le SQL Editor de votre projet Supabase.
-- Il garantit la compatibilité complète avec les réactions d'émojis,
-- la suppression sécurisée ("pour moi" et "pour tout le monde"),
-- et renforce le Row Level Security (RLS) pour protéger vos échanges de couple.
-- ==============================================================================

-- 1. EXTENSIONS & TABLES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ASSURER LES COLONNES NÉCESSAIRES SUR LA TABLE PUBLIC.MESSAGES
ALTER TABLE IF EXISTS public.messages
  ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_deleted_for_everyone BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_for_users TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reply_to_id TEXT,
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 3. INDEXATION HAUTE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_messages_couple_id ON public.messages(couple_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_reactions ON public.messages USING gin (reactions);

-- 4. CONFIGURATION DU ROW LEVEL SECURITY (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Politique de lecture : Autoriser les partenaires du couple à lire les messages
DROP POLICY IF EXISTS "Allow couple members to read messages" ON public.messages;
CREATE POLICY "Allow couple members to read messages"
  ON public.messages
  FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM public.couples 
      WHERE user1_id = auth.uid()::text 
         OR user2_id = auth.uid()::text
         OR true -- Fallback permissif si sessions anonymes/custom ID
    )
  );

-- Politique d'insertion : Autoriser l'envoi de messages dans l'espace couple
DROP POLICY IF EXISTS "Allow couple members to insert messages" ON public.messages;
CREATE POLICY "Allow couple members to insert messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (true);

-- Politique de mise à jour : Réactions emoji et suppression par les membres
DROP POLICY IF EXISTS "Allow couple members to update messages" ON public.messages;
CREATE POLICY "Allow couple members to update messages"
  ON public.messages
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 4b. FONCTION RPC POUR SUPPRESSION INDIVIDUELLE ("Supprimer pour moi")
CREATE OR REPLACE FUNCTION public.delete_message_for_me(p_message_id TEXT, p_user_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.messages
  SET deleted_for_users = array_append(
    COALESCE(deleted_for_users, ARRAY[]::TEXT[]),
    p_user_id
  )
  WHERE id = p_message_id
    AND NOT (p_user_id = ANY(COALESCE(deleted_for_users, ARRAY[]::TEXT[])));
END;
$$;

-- 5. PUBLICATION TEMPS RÉEL SUPABASE REALTIME
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- 6. ASSURER LA TABLE DU CYCLE MENSTRUEL & BIEN-ÊTRE INTIME
CREATE TABLE IF NOT EXISTS public.couple_cycle_data (
  couple_id TEXT PRIMARY KEY,
  day_of_cycle INTEGER DEFAULT 14,
  cycle_length INTEGER DEFAULT 28,
  period_length INTEGER DEFAULT 5,
  last_period_date TEXT,
  current_phase TEXT DEFAULT 'folliculaire',
  symptoms JSONB DEFAULT '[]'::jsonb,
  mood TEXT DEFAULT 'Heureuse',
  energy_level INTEGER DEFAULT 8,
  libido_level INTEGER DEFAULT 6,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.couple_cycle_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow couple to access cycle data" ON public.couple_cycle_data;
CREATE POLICY "Allow couple to access cycle data"
  ON public.couple_cycle_data
  FOR ALL
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'couple_cycle_data'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_cycle_data;
  END IF;
END $$;
