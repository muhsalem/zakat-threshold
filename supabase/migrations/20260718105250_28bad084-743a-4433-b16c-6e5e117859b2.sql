
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan_id TEXT NOT NULL DEFAULT 'free',
  plan_name TEXT NOT NULL DEFAULT 'الخطة المجانية',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','canceled','trialing','past_due')),
  billing_period TEXT NOT NULL DEFAULT 'yearly' CHECK (billing_period IN ('monthly','yearly','lifetime','one_time')),
  amount NUMERIC(10,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  renews_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_subscriptions TO service_role;

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own subscription"
  ON public.user_subscriptions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins read all subscriptions"
  ON public.user_subscriptions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_user_subscriptions_updated
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ensure every new user gets a free-tier row
CREATE OR REPLACE FUNCTION public.ensure_default_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan_id, plan_name, billing_period, amount, currency)
  VALUES (NEW.id, 'free', 'الخطة المجانية', 'yearly', 0, 'USD')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.ensure_default_subscription();

-- backfill existing users
INSERT INTO public.user_subscriptions (user_id, plan_id, plan_name, billing_period, amount, currency)
SELECT id, 'free', 'الخطة المجانية', 'yearly', 0, 'USD' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
