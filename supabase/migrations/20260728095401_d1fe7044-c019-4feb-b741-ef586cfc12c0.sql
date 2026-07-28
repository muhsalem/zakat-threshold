REVOKE ALL ON FUNCTION public.log_pdf_report_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.next_pdf_report_uid() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_pdf_report_uid() TO service_role;
GRANT EXECUTE ON FUNCTION public.log_pdf_report_change() TO service_role;