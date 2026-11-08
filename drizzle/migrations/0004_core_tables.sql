CREATE TYPE public.app_role AS ENUM ('admin','jeweler','ambassador','volunteer');

CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, role));
GRANT SELECT ON public.user_roles TO authenticated; GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, display_name text, org text, contact text, license text, country text, city text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated; GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE TABLE public.audit_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid, action text NOT NULL, entity text NOT NULL DEFAULT '', entity_id text, reason text NOT NULL DEFAULT '', meta jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.audit_log TO authenticated; GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit read admin" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "audit insert self" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

CREATE TABLE public.official_sources (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), country text NOT NULL, authority text NOT NULL DEFAULT '', url text NOT NULL, currency text, metal text, active boolean NOT NULL DEFAULT true, last_checked timestamptz, last_hash text, last_snippet text, last_value numeric, last_error text, last_changed timestamptz, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.official_sources TO anon; GRANT SELECT, INSERT, UPDATE, DELETE ON public.official_sources TO authenticated; GRANT ALL ON public.official_sources TO service_role;
ALTER TABLE public.official_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sources read" ON public.official_sources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "sources admin" ON public.official_sources FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.official_nisab (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), country text NOT NULL, currency text NOT NULL, authority text NOT NULL DEFAULT '', source_url text, gold_nisab numeric, silver_nisab numeric, announced_on date NOT NULL DEFAULT CURRENT_DATE, created_by uuid, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.official_nisab TO anon; GRANT SELECT, INSERT, UPDATE, DELETE ON public.official_nisab TO authenticated; GRANT ALL ON public.official_nisab TO service_role;
ALTER TABLE public.official_nisab ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onisab read" ON public.official_nisab FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "onisab admin" ON public.official_nisab FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.nisab_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), country text NOT NULL, day date NOT NULL, currency text NOT NULL DEFAULT 'USD', gold_gram numeric, silver_gram numeric, spot_gram numeric, gold_nisab numeric, silver_nisab numeric, source text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(country, day));
GRANT SELECT ON public.nisab_history TO anon, authenticated; GRANT ALL ON public.nisab_history TO service_role;
ALTER TABLE public.nisab_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history read" ON public.nisab_history FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.jeweler_feed (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), country text NOT NULL, currency text NOT NULL, day date NOT NULL DEFAULT CURRENT_DATE, gold_gram numeric, silver_gram numeric, buyback_gram numeric, silver_buyback_gram numeric, source text NOT NULL DEFAULT '', fetched_at timestamptz NOT NULL DEFAULT now(), UNIQUE(country, day));
GRANT SELECT ON public.jeweler_feed TO anon, authenticated; GRANT ALL ON public.jeweler_feed TO service_role;
ALTER TABLE public.jeweler_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feed read" ON public.jeweler_feed FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.notification_prefs (user_id uuid PRIMARY KEY, in_app boolean NOT NULL DEFAULT true, daily_digest boolean NOT NULL DEFAULT false, countries text[] NOT NULL DEFAULT '{}', metals text[] NOT NULL DEFAULT '{gold,silver}', updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_prefs TO authenticated; GRANT ALL ON public.notification_prefs TO service_role;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs own" ON public.notification_prefs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, kind text NOT NULL DEFAULT '', country text, title text NOT NULL DEFAULT '', body text NOT NULL DEFAULT '', read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated; GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif own" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.price_submissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, country text NOT NULL, city text NOT NULL DEFAULT '', currency text NOT NULL, metal text NOT NULL DEFAULT 'gold', gold_gram numeric, silver_gram numeric, buyback_gram numeric, source text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'pending', reviewed_by uuid, reviewed_at timestamptz, review_reason text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.price_submissions TO authenticated; GRANT ALL ON public.price_submissions TO service_role;
ALTER TABLE public.price_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs read" ON public.price_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "subs insert" ON public.price_submissions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "subs review" ON public.price_submissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.price_votes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), submission_id uuid NOT NULL REFERENCES public.price_submissions(id) ON DELETE CASCADE, user_id uuid NOT NULL, vote smallint NOT NULL CHECK (vote IN (-1,1)), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(submission_id, user_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_votes TO authenticated; GRANT ALL ON public.price_votes TO service_role;
ALTER TABLE public.price_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes read" ON public.price_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "votes own" ON public.price_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "votes upd" ON public.price_votes FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "votes del" ON public.price_votes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.public_price_quotes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), country text NOT NULL, city text NOT NULL DEFAULT '', currency text NOT NULL, metal text NOT NULL DEFAULT 'gold', gold_gram numeric, silver_gram numeric, buyback_gram numeric, source text NOT NULL DEFAULT '', reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.public_price_quotes TO anon, authenticated; GRANT ALL ON public.public_price_quotes TO service_role;
ALTER TABLE public.public_price_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes read" ON public.public_price_quotes FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.verify_job_token(_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT true $$;
REVOKE EXECUTE ON FUNCTION public.verify_job_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_job_token(text) TO service_role;