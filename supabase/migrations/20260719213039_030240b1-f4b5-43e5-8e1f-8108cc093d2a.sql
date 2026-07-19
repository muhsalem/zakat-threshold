
CREATE TABLE public.price_fetch_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  job_name text NOT NULL,
  status text NOT NULL,
  primary_source text,
  fallback_source text,
  fallback_used boolean NOT NULL DEFAULT false,
  currencies_requested text[] DEFAULT ARRAY[]::text[],
  currencies_missing text[] DEFAULT ARRAY[]::text[],
  records_written integer DEFAULT 0,
  duration_ms integer,
  http_status integer,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT price_fetch_audit_status_check CHECK (status IN ('success','partial','error')),
  CONSTRAINT price_fetch_audit_job_check CHECK (job_name IN ('snapshot-daily-prices','snapshot-daily-nisab','daily-metal-prices-snapshot'))
);

CREATE INDEX idx_price_fetch_audit_run_at ON public.price_fetch_audit (run_at DESC);
CREATE INDEX idx_price_fetch_audit_job_status ON public.price_fetch_audit (job_name, status, run_at DESC);

GRANT SELECT ON public.price_fetch_audit TO authenticated;
GRANT ALL ON public.price_fetch_audit TO service_role;

ALTER TABLE public.price_fetch_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accountants and admins can read price fetch audit"
  ON public.price_fetch_audit
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'accountant') OR
    public.has_role(auth.uid(), 'admin')
  );
