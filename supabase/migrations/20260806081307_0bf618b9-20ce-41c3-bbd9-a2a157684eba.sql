
CREATE OR REPLACE FUNCTION public.notify_sharia_review_recipient(
  _user_id uuid, _type text, _title text, _body text, _link text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL OR _user_id = auth.uid() THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (_user_id, _type, _title, _body, _link);
END; $$;

CREATE OR REPLACE FUNCTION public.notify_sharia_review_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_link text := '/sharia-review?request=' || NEW.id::text;
  r RECORD;
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    IF NEW.status = 'submitted' THEN
      FOR r IN SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('moderator','admin') LOOP
        PERFORM public.notify_sharia_review_recipient(
          r.user_id, 'sharia_review_submitted',
          'طلب مراجعة شرعية جديد',
          NEW.title, v_link);
      END LOOP;
      PERFORM public.notify_sharia_review_recipient(
        NEW.requester_id, 'sharia_review_submitted',
        'تم رفع طلب المراجعة الشرعية', NEW.title, v_link);
    ELSIF NEW.status IN ('approved','rejected','changes_requested','in_review') THEN
      PERFORM public.notify_sharia_review_recipient(
        NEW.requester_id,
        'sharia_review_' || NEW.status::text,
        CASE NEW.status
          WHEN 'approved' THEN 'تم اعتماد طلب المراجعة الشرعية'
          WHEN 'rejected' THEN 'تم رفض طلب المراجعة الشرعية'
          WHEN 'changes_requested' THEN 'طُلبت تعديلات على طلب المراجعة'
          ELSE 'طلبك قيد المراجعة الآن'
        END,
        COALESCE(NEW.decision_note, NEW.title), v_link);
      PERFORM public.notify_sharia_review_recipient(
        NEW.reviewer_id, 'sharia_review_' || NEW.status::text,
        'تم تسجيل قرارك على طلب المراجعة', NEW.title, v_link);
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_sharia_review_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  req RECORD;
  v_link text := '/sharia-review?request=' || NEW.request_id::text;
  r RECORD;
BEGIN
  SELECT id, title, requester_id, reviewer_id INTO req
  FROM public.sharia_review_requests WHERE id = NEW.request_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF NEW.is_internal THEN
    FOR r IN SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('moderator','admin') LOOP
      PERFORM public.notify_sharia_review_recipient(
        r.user_id, 'sharia_review_comment',
        'تعليق داخلي جديد على طلب مراجعة', req.title, v_link);
    END LOOP;
  ELSE
    PERFORM public.notify_sharia_review_recipient(
      req.requester_id, 'sharia_review_comment',
      'تعليق جديد على طلب المراجعة الشرعية', req.title, v_link);
    PERFORM public.notify_sharia_review_recipient(
      req.reviewer_id, 'sharia_review_comment',
      'تعليق جديد على طلب المراجعة الشرعية', req.title, v_link);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_srr_notify ON public.sharia_review_requests;
CREATE TRIGGER trg_srr_notify AFTER INSERT OR UPDATE ON public.sharia_review_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_sharia_review_request();

DROP TRIGGER IF EXISTS trg_src_notify ON public.sharia_review_comments;
CREATE TRIGGER trg_src_notify AFTER INSERT ON public.sharia_review_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_sharia_review_comment();
