-- Table for accountant-managed clients
CREATE TABLE public.accountant_clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  kind text NOT NULL DEFAULT 'individual',
  currency text NOT NULL DEFAULT 'SAR',
  country text NOT NULL DEFAULT 'SA',
  madhab text NOT NULL DEFAULT 'mixed',
  fiscal_year integer NOT NULL DEFAULT extract(year from now())::int,
  status text NOT NULL DEFAULT 'new',
  hawl_date date,
  nisab numeric NOT NULL DEFAULT 0,
  breakdown jsonb NOT NULL DEFAULT '{"cash":0,"gold":0,"investments":0,"inventory":0,"receivables":0,"debts":0}'::jsonb,
  notes text,
  created_via text NOT NULL DEFAULT 'manual',
  last_calc_at timestamptz,
  last_calc_amount numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accountant_clients TO authenticated;
GRANT ALL ON public.accountant_clients TO service_role;

ALTER TABLE public.accountant_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accountants manage own clients (select)" ON public.accountant_clients
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Accountants manage own clients (insert)" ON public.accountant_clients
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Accountants manage own clients (update)" ON public.accountant_clients
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Accountants manage own clients (delete)" ON public.accountant_clients
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER trg_accountant_clients_updated
  BEFORE UPDATE ON public.accountant_clients
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_accountant_clients_owner ON public.accountant_clients(owner_id, updated_at DESC);

-- History log for client events
CREATE TABLE public.accountant_client_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.accountant_clients(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  by_name text,
  amount numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.accountant_client_history TO authenticated;
GRANT ALL ON public.accountant_client_history TO service_role;

ALTER TABLE public.accountant_client_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads history" ON public.accountant_client_history
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner writes history" ON public.accountant_client_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner deletes history" ON public.accountant_client_history
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE INDEX idx_accountant_client_history_client ON public.accountant_client_history(client_id, created_at DESC);
