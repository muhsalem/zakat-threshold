
ALTER TABLE public.user_report_archive
  ADD COLUMN share_token text UNIQUE,
  ADD COLUMN share_expires_at timestamptz,
  ADD COLUMN share_revoked_at timestamptz;

CREATE INDEX idx_user_report_archive_share_token
  ON public.user_report_archive (share_token) WHERE share_token IS NOT NULL;
