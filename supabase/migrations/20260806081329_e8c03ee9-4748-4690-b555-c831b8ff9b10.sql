
REVOKE ALL ON FUNCTION public.notify_sharia_review_recipient(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_sharia_review_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_sharia_review_comment() FROM PUBLIC, anon, authenticated;
