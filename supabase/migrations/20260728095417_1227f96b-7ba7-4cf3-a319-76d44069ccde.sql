CREATE POLICY "pdf_reports_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'pdf-reports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "pdf_reports_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pdf-reports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "pdf_reports_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'pdf-reports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "pdf_reports_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pdf-reports' AND (storage.foldername(name))[1] = auth.uid()::text);