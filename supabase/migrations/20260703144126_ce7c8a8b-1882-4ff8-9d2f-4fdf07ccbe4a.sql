
CREATE TABLE public.erp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('odoo','sap','odoo_sandbox','sap_sandbox')),
  label text NOT NULL DEFAULT 'ERP',
  base_url text NOT NULL,
  db_name text,
  username text,
  api_key text NOT NULL,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_tested_at timestamptz,
  last_test_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_connections TO authenticated;
GRANT ALL ON public.erp_connections TO service_role;
ALTER TABLE public.erp_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own erp connections" ON public.erp_connections FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.erp_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES public.erp_connections(id) ON DELETE CASCADE,
  zakat_record_id uuid REFERENCES public.zakat_records(id) ON DELETE SET NULL,
  provider text NOT NULL,
  external_id text,
  status text NOT NULL DEFAULT 'pending',
  reference text,
  amount numeric(18,2),
  currency text,
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_erp_sync_log_user ON public.erp_sync_log(user_id, created_at DESC);
CREATE INDEX idx_erp_sync_log_conn ON public.erp_sync_log(connection_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_sync_log TO authenticated;
GRANT ALL ON public.erp_sync_log TO service_role;
ALTER TABLE public.erp_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own erp sync log" ON public.erp_sync_log FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_erp_connections_updated
  BEFORE UPDATE ON public.erp_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
