
REVOKE ALL ON FUNCTION public.log_sharia_review_request_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_sharia_review_comment_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
