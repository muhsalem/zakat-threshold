-- فهارس ناقصة على أعمدة مفاتيح أجنبية مُستخدَمة فعلياً بشروط WHERE/JOIN —
-- بدونها: full scan عند كل استعلام، وبطء إضافي عند حذف الصف الأب (FK check).
CREATE INDEX IF NOT EXISTS idx_zakat_approvals_zakat_record_id
  ON public.zakat_approvals (zakat_record_id);
CREATE INDEX IF NOT EXISTS idx_zakat_approvals_organization_id
  ON public.zakat_approvals (organization_id);
CREATE INDEX IF NOT EXISTS idx_sharia_attestations_zakat_record_id
  ON public.sharia_attestations (zakat_record_id);
CREATE INDEX IF NOT EXISTS idx_erp_sync_log_zakat_record_id
  ON public.erp_sync_log (zakat_record_id);
