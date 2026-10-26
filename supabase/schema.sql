-- Reconstructed schema for a fresh Lovable Cloud / Supabase project.
--
-- Built from src/integrations/supabase/types.ts and from how the code uses each table.
-- The original project's SQL was not in the repository, so the column types, defaults,
-- unique keys and especially the RLS policies and the three helper functions below are a
-- REVIEWED-BY-YOU starting point, not a copy of the old database. Read it before applying,
-- and test the policies with an anonymous and an ordinary signed-in user.
--
-- Order matters: run top to bottom in the SQL editor of a new project.

-- ---------------------------------------------------------------- roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'jeweler', 'ambassador', 'volunteer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER so policies can check roles without recursing into user_roles' own RLS.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

DROP POLICY IF EXISTS "Users read their own roles" ON public.user_roles;
CREATE POLICY "Users read their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  org text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT '',
  license text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner reads profile" ON public.profiles;
CREATE POLICY "Owner reads profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Owner writes profile" ON public.profiles;
CREATE POLICY "Owner writes profile" ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Public face of a profile: no contact details or licence numbers.
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT id, display_name, org, country, city FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_trusted(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'jeweler', 'ambassador')
  );
$$;

-- ---------------------------------------------------------------- settings and audit
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY; -- server-only: no policies on purpose

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  reason text NOT NULL DEFAULT '',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read the audit log" ON public.audit_log;
CREATE POLICY "Admins read the audit log" ON public.audit_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
GRANT ALL ON public.audit_log TO service_role;

-- Tokens for scheduled jobs (stored hashed). verify_job_token() checks one by name.
CREATE TABLE IF NOT EXISTS public.job_tokens (
  name text PRIMARY KEY,
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.job_tokens ENABLE ROW LEVEL SECURITY; -- no policies: only the function reads it
CREATE OR REPLACE FUNCTION public.verify_job_token(_name text, _token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.job_tokens
    WHERE name = _name AND token_hash = encode(extensions.digest(_token, 'sha256'), 'hex')
  );
$$;
REVOKE ALL ON FUNCTION public.verify_job_token(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_job_token(text, text) TO service_role;

-- ---------------------------------------------------------------- prices and nisab history
CREATE TABLE IF NOT EXISTS public.jeweler_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  currency text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  gold_gram numeric,
  buyback_gram numeric,
  silver_gram numeric,
  silver_buyback_gram numeric,
  change_pct numeric,
  source text NOT NULL,
  source_url text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country, day)
);
ALTER TABLE public.jeweler_feed ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Jeweller feed is public" ON public.jeweler_feed;
CREATE POLICY "Jeweller feed is public" ON public.jeweler_feed FOR SELECT USING (true);
GRANT SELECT ON public.jeweler_feed TO anon, authenticated;
GRANT ALL ON public.jeweler_feed TO service_role;

CREATE TABLE IF NOT EXISTS public.nisab_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  currency text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  gold_gram numeric,
  silver_gram numeric,
  gold_nisab numeric,
  silver_nisab numeric,
  source text NOT NULL,
  source_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country, day)
);
ALTER TABLE public.nisab_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Nisab history is public" ON public.nisab_history;
CREATE POLICY "Nisab history is public" ON public.nisab_history FOR SELECT USING (true);
GRANT SELECT ON public.nisab_history TO anon, authenticated;
GRANT ALL ON public.nisab_history TO service_role;

CREATE TABLE IF NOT EXISTS public.official_nisab (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  currency text NOT NULL,
  authority text NOT NULL,
  gold_nisab numeric,
  silver_nisab numeric,
  source_url text NOT NULL DEFAULT '',
  announced_on date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.official_nisab ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Official nisab is public" ON public.official_nisab;
CREATE POLICY "Official nisab is public" ON public.official_nisab FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins write official nisab" ON public.official_nisab;
CREATE POLICY "Admins write official nisab" ON public.official_nisab
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.official_nisab TO anon, authenticated;
GRANT ALL ON public.official_nisab TO service_role;

CREATE TABLE IF NOT EXISTS public.official_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  currency text NOT NULL,
  authority text NOT NULL,
  metal text NOT NULL,
  url text NOT NULL,
  value_pattern text,
  active boolean NOT NULL DEFAULT true,
  last_checked timestamptz,
  last_changed timestamptz,
  last_hash text,
  last_snippet text NOT NULL DEFAULT '',
  last_value numeric,
  last_error text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.official_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Official sources are public" ON public.official_sources;
CREATE POLICY "Official sources are public" ON public.official_sources FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage official sources" ON public.official_sources;
CREATE POLICY "Admins manage official sources" ON public.official_sources
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.official_sources TO anon, authenticated;
GRANT ALL ON public.official_sources TO service_role;

-- price_snapshots and market_ticks (same SQL as drizzle/migrations 0001 and 0002)
CREATE TABLE IF NOT EXISTS public.price_snapshots (
  day date PRIMARY KEY,
  taken_at timestamptz NOT NULL DEFAULT now(),
  gold_usd_oz numeric NOT NULL CHECK (gold_usd_oz > 0),
  silver_usd_oz numeric NOT NULL CHECK (silver_usd_oz > 0),
  metals_source text NOT NULL,
  consensus_status text NOT NULL,
  deviation_pct numeric NOT NULL DEFAULT 0,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  rejected jsonb NOT NULL DEFAULT '[]'::jsonb,
  fx_source text NOT NULL DEFAULT '',
  fx_rates jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Price snapshots are public" ON public.price_snapshots;
CREATE POLICY "Price snapshots are public" ON public.price_snapshots FOR SELECT USING (true);
GRANT SELECT ON public.price_snapshots TO anon, authenticated;
GRANT ALL ON public.price_snapshots TO service_role;
CREATE OR REPLACE FUNCTION public.price_snapshots_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'price_snapshots rows are immutable'; END; $$;
DROP TRIGGER IF EXISTS price_snapshots_no_change ON public.price_snapshots;
CREATE TRIGGER price_snapshots_no_change
  BEFORE UPDATE OR DELETE ON public.price_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.price_snapshots_immutable();
-- >>> now also run drizzle/migrations/0002_market_ticks.sql <<<

-- ---------------------------------------------------------------- crowd-sourced prices
CREATE TABLE IF NOT EXISTS public.price_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country text NOT NULL,
  city text NOT NULL DEFAULT '',
  currency text NOT NULL,
  metal text NOT NULL,
  gold_gram numeric,
  silver_gram numeric,
  buyback_gram numeric,
  source text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  auto_approved boolean NOT NULL DEFAULT false,
  quality integer,
  ai_summary text,
  review_reason text NOT NULL DEFAULT '',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.price_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner reads own submissions" ON public.price_submissions;
CREATE POLICY "Owner reads own submissions" ON public.price_submissions
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Signed-in users submit" ON public.price_submissions;
CREATE POLICY "Signed-in users submit" ON public.price_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending' AND NOT auto_approved);
DROP POLICY IF EXISTS "Admins moderate submissions" ON public.price_submissions;
CREATE POLICY "Admins moderate submissions" ON public.price_submissions
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT ALL ON public.price_submissions TO service_role;

-- Only approved quotes are public, and without the submitter's identity.
CREATE OR REPLACE VIEW public.public_price_quotes AS
  SELECT id, country, city, currency, metal, gold_gram, silver_gram, buyback_gram,
         source, created_at, reviewed_at
  FROM public.price_submissions WHERE status = 'approved';
GRANT SELECT ON public.public_price_quotes TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.price_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.price_submissions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote smallint NOT NULL CHECK (vote IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, user_id)
);
ALTER TABLE public.price_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Voters manage their votes" ON public.price_votes;
CREATE POLICY "Voters manage their votes" ON public.price_votes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Votes are readable by signed-in users" ON public.price_votes;
CREATE POLICY "Votes are readable by signed-in users" ON public.price_votes
  FOR SELECT TO authenticated USING (true);
GRANT ALL ON public.price_votes TO service_role;

-- Leaderboard of contributors: approved submissions, votes received and a simple score.
CREATE OR REPLACE FUNCTION public.jeweler_leaderboard(_country text DEFAULT NULL)
RETURNS TABLE (
  user_id uuid, display_name text, org text, country text,
  approved bigint, up_votes bigint, down_votes bigint, accuracy numeric, points numeric
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.org, p.country,
         count(DISTINCT s.id) FILTER (WHERE s.status = 'approved') AS approved,
         count(v.id) FILTER (WHERE v.vote = 1) AS up_votes,
         count(v.id) FILTER (WHERE v.vote = -1) AS down_votes,
         CASE WHEN count(v.id) = 0 THEN 0
              ELSE round(100.0 * count(v.id) FILTER (WHERE v.vote = 1) / count(v.id), 1) END AS accuracy,
         count(DISTINCT s.id) FILTER (WHERE s.status = 'approved') * 10
           + count(v.id) FILTER (WHERE v.vote = 1) - count(v.id) FILTER (WHERE v.vote = -1) AS points
  FROM public.profiles p
  JOIN public.price_submissions s ON s.user_id = p.id
  LEFT JOIN public.price_votes v ON v.submission_id = s.id
  WHERE _country IS NULL OR _country = '' OR p.country = _country
  GROUP BY p.id, p.display_name, p.org, p.country
  ORDER BY points DESC, approved DESC
  LIMIT 50;
$$;
GRANT EXECUTE ON FUNCTION public.jeweler_leaderboard(text) TO anon, authenticated;

-- ---------------------------------------------------------------- notifications
CREATE TABLE IF NOT EXISTS public.notification_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  countries text[] NOT NULL DEFAULT '{}',
  metals text[] NOT NULL DEFAULT '{gold,silver}',
  in_app boolean NOT NULL DEFAULT true,
  email boolean NOT NULL DEFAULT false,
  daily_digest boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages preferences" ON public.notification_prefs;
CREATE POLICY "Owner manages preferences" ON public.notification_prefs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT ALL ON public.notification_prefs TO service_role;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  country text NOT NULL DEFAULT '',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner reads notifications" ON public.notifications;
CREATE POLICY "Owner reads notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner marks notifications read" ON public.notifications;
CREATE POLICY "Owner marks notifications read" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT ALL ON public.notifications TO service_role;

-- ---------------------------------------------------------------- indexes
CREATE INDEX IF NOT EXISTS nisab_history_country_day ON public.nisab_history (country, day DESC);
CREATE INDEX IF NOT EXISTS jeweler_feed_country_day ON public.jeweler_feed (country, day DESC);
CREATE INDEX IF NOT EXISTS notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS price_submissions_status ON public.price_submissions (status, created_at DESC);
