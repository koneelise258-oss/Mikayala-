-- ==============================================================================
-- MIKAYALA WHATSAPP COUPLE - VAULT ITEMS TABLE MIGRATION
-- ==============================================================================
-- Exécutez ce script dans le SQL Editor de votre projet Supabase pour activer
-- le partage instantané du Coffre-fort entre tous vos appareils (tablette, téléphone, etc.)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.vault_items (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL,
  title TEXT,
  type TEXT DEFAULT 'photo',
  media_type TEXT DEFAULT 'photo',
  media_url TEXT,
  thumbnail_url TEXT,
  storage_path TEXT,
  duration INTEGER DEFAULT 0,
  category TEXT DEFAULT 'intime',
  added_by TEXT,
  added_by_name TEXT,
  added_by_avatar TEXT,
  date_added BIGINT,
  is_view_once BOOLEAN DEFAULT FALSE,
  is_viewed BOOLEAN DEFAULT FALSE,
  is_burned BOOLEAN DEFAULT FALSE,
  caption TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  source TEXT DEFAULT 'upload',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performances et filtrage par couple
CREATE INDEX IF NOT EXISTS idx_vault_items_couple_id ON public.vault_items(couple_id);
CREATE INDEX IF NOT EXISTS idx_vault_items_date_added ON public.vault_items(date_added DESC);

-- Activation RLS et politiques permissives pour le couple
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow couple members to access vault items" ON public.vault_items;
CREATE POLICY "Allow couple members to access vault items"
  ON public.vault_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Publication Supabase Realtime pour synchronisation en temps réel entre appareils
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'vault_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vault_items;
  END IF;
END $$;

ALTER TABLE public.vault_items REPLICA IDENTITY FULL;
