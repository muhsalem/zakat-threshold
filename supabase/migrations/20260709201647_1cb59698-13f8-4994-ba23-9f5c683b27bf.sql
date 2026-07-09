REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_hawl_reminders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.capture_zakat_draft_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_hawl_reminders() TO service_role;