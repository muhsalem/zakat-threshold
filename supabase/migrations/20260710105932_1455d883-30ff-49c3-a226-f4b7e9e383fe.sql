-- Speed up the drafts/history pages: the list is filtered by user_id and
-- sorted by gregorian_date desc (with fallbacks by zakat_due). Composite
-- indexes lets Postgres serve pages via an index scan instead of a sort.

CREATE INDEX IF NOT EXISTS zakat_records_user_greg_desc_idx
  ON public.zakat_records (user_id, gregorian_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS zakat_records_user_zakat_due_idx
  ON public.zakat_records (user_id, zakat_due DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS zakat_records_user_created_desc_idx
  ON public.zakat_records (user_id, created_at DESC);

-- Drafts list is small but frequently re-queried; index the ordering.
CREATE INDEX IF NOT EXISTS zakat_drafts_user_updated_desc_idx
  ON public.zakat_drafts (user_id, updated_at DESC);

-- Versions dialog: always filtered by draft_id, ordered by created_at desc.
CREATE INDEX IF NOT EXISTS zakat_draft_versions_draft_created_desc_idx
  ON public.zakat_draft_versions (draft_id, created_at DESC);