-- profiles: add plan tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

-- payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_session_id text UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_id text,
  status text NOT NULL,
  amount_paid numeric,
  currency text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admins read all payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "accountants read all payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'accountant'));

CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS payments_session_idx ON public.payments(stripe_session_id);

CREATE TRIGGER trg_payments_updated
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
