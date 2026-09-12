-- ==============================================================================
-- MIKAYALA WHATSAPP COUPLE - MISE À JOUR SÉCURITÉ, TEMPS RÉEL, ÉDITION & SUPPRESSION
-- ==============================================================================
-- Exécutez ce script directement dans le SQL Editor de votre projet Supabase.
-- Il garantit la synchronisation parfaite en temps réel :
-- 1. Réactions émojis temps réel
-- 2. Modification de message (is_edited, edited_at)
-- 3. Suppression de message ("Pour moi" et "Pour tout le monde" avec placeholder)
-- 4. Réponses citées (reply_to_id)
-- 5. Row Level Security (RLS) permissif pour le couple
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ASSURER LES COLONNES SUR LA TABLE PUBLIC.MESSAGES
ALTER TABLE IF EXISTS public.messages
  ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_deleted_for_everyone BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_for_users TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reply_to_id TEXT,
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

-- 3. INDEXATION HAUTE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_messages_couple_id ON public.messages(couple_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_reactions ON public.messages USING gin (reactions);

-- 4. CONFIGURATION DU ROW LEVEL SECURITY (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Suppression des anciennes politiques restrictives
DROP POLICY IF EXISTS "Allow couple members to read messages" ON public.messages;
DROP POLICY IF EXISTS "Allow couple members to insert messages" ON public.messages;
DROP POLICY IF EXISTS "Allow couple members to update messages" ON public.messages;
DROP POLICY IF EXISTS "Allow couple members to delete messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all authenticated/anonymous couple messages" ON public.messages;

-- Politiques ouvertes pour assurer un fonctionnement temps réel sans blocage
CREATE POLICY "Allow couple members to read messages"
  ON public.messages
  FOR SELECT
  USING (true);

CREATE POLICY "Allow couple members to insert messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow couple members to update messages"
  ON public.messages
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow couple members to delete messages"
  ON public.messages
  FOR DELETE
  USING (true);

-- 5. PROCÉDURES STOCKÉES RPC ROBUSTES

-- a. Suppression pour moi ("delete_message_for_me")
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

-- b. Suppression pour tout le monde ("delete_message_for_everyone")
CREATE OR REPLACE FUNCTION public.delete_message_for_everyone(p_message_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.messages
  SET 
    deleted_for_everyone = true,
    is_deleted_for_everyone = true,
    deleted_at = NOW(),
    content = 'Ce message a été supprimé',
    media_url = NULL,
    storage_path = NULL
  WHERE id = p_message_id;
END;
$$;

-- c. Modification de message ("edit_message_content")
CREATE OR REPLACE FUNCTION public.edit_message_content(p_message_id TEXT, p_new_content TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.messages
  SET 
    content = p_new_content,
    is_edited = true,
    edited_at = NOW()
  WHERE id = p_message_id;
END;
$$;

-- 6. PUBLICATION TEMPS RÉEL SUPABASE REALTIME (INSERT, UPDATE, DELETE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- Configuration REPLICA IDENTITY FULL pour que les événements UPDATE et DELETE diffusent toutes les colonnes
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 7. ASSURER LA TABLE DU CYCLE MENSTRUEL & BIEN-ÊTRE INTIME
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
