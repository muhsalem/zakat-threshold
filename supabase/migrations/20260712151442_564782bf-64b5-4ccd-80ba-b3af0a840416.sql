-- انقل الدالة إلى مخطط private (غير مكشوف عبر PostgREST)
DROP TRIGGER IF EXISTS trg_zakat_approvals_audit ON public.zakat_approvals;
DROP FUNCTION IF EXISTS public.log_zakat_approval_change();

CREATE OR REPLACE FUNCTION private.log_zakat_approval_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_action text;
  v_actor uuid := auth.uid();
  v_org uuid;
  v_before jsonb;
  v_after jsonb;
  v_changed text[] := ARRAY[]::text[];
  v_note text := NULL;
  k text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'insert';
    v_org := NEW.organization_id;
    v_after := to_jsonb(NEW);
    v_before := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_org := NEW.organization_id;
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'approved' THEN v_action := 'approve';
      ELSIF NEW.status = 'rejected' THEN v_action := 'reject';
      ELSIF NEW.status = 'pending' AND OLD.status IN ('approved','rejected') THEN v_action := 'reopen';
      ELSE v_action := 'update';
      END IF;
      v_note := NEW.checker_note;
    ELSE
      v_action := 'update';
    END IF;

    FOR k IN SELECT jsonb_object_keys(v_after) LOOP
      IF (v_before->k) IS DISTINCT FROM (v_after->k) THEN
        v_changed := array_append(v_changed, k);
      END IF;
    END LOOP;

    IF array_length(v_changed,1) IS NULL THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_org := OLD.organization_id;
    v_before := to_jsonb(OLD);
    v_after := NULL;
  END IF;

  INSERT INTO public.org_audit_log (
    organization_id, actor_id, entity_type, entity_id,
    action, changed_fields, before_state, after_state, note
  )
  VALUES (
    v_org, v_actor, 'zakat_approval',
    COALESCE(NEW.id, OLD.id),
    v_action, NULLIF(v_changed, ARRAY[]::text[]),
    v_before, v_after, v_note
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION private.log_zakat_approval_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_zakat_approvals_audit
AFTER INSERT OR UPDATE OR DELETE ON public.zakat_approvals
FOR EACH ROW EXECUTE FUNCTION private.log_zakat_approval_change();