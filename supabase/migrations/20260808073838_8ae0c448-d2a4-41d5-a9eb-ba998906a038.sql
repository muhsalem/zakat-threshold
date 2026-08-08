CREATE OR REPLACE FUNCTION public.next_pdf_report_uid()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  n bigint;
BEGIN
  n := nextval('public.pdf_report_seq');
  RETURN 'RPT-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 6, '0');
END;
$function$;

REVOKE ALL ON FUNCTION public.next_pdf_report_uid() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_pdf_report_uid() TO authenticated, service_role;