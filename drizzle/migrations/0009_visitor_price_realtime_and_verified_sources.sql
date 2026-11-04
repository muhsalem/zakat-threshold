ALTER TABLE public.official_sources ADD COLUMN IF NOT EXISTS verified_excerpt text;
ALTER TABLE public.official_sources ADD COLUMN IF NOT EXISTS published_on date;
ALTER TABLE public.official_sources ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.official_sources ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'announcement';
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'jeweler_feed') THEN
ALTER PUBLICATION supabase_realtime ADD TABLE public.jeweler_feed;
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'public_price_quotes') THEN
ALTER PUBLICATION supabase_realtime ADD TABLE public.public_price_quotes;
END IF;
END $$;