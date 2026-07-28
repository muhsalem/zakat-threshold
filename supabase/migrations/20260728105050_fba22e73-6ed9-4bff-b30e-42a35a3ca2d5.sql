CREATE OR REPLACE FUNCTION public.log_zakat_record_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_user uuid;
  v_record_id uuid;
  v_payload jsonb;
  v_refs text[] := ARRAY[]::text[];
  v_changed text[] := ARRAY[]::text[];
  v_snapshot jsonb;
  v_fatwa_ref text;
  v_fp text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create_zakat_record';
    v_record_id := NEW.id;
    v_user := NEW.user_id;
    v_snapshot := NEW.snapshot;
    v_payload := jsonb_build_object('after', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update_zakat_record';
    v_record_id := NEW.id;
    v_user := COALESCE(auth.uid(), NEW.user_id);
    v_snapshot := NEW.snapshot;
    -- track which domain fields changed
    IF NEW.total_assets IS DISTINCT FROM OLD.total_assets THEN v_changed := v_changed || 'total_assets'; END IF;
    IF NEW.total_liabilities IS DISTINCT FROM OLD.total_liabilities THEN v_changed := v_changed || 'total_liabilities'; END IF;
    IF NEW.zakat_base IS DISTINCT FROM OLD.zakat_base THEN v_changed := v_changed || 'zakat_base'; END IF;
    IF NEW.zakat_due IS DISTINCT FROM OLD.zakat_due THEN v_changed := v_changed || 'zakat_due'; END IF;
    IF NEW.prepaid_zakat IS DISTINCT FROM OLD.prepaid_zakat THEN v_changed := v_changed || 'prepaid_zakat'; END IF;
    IF NEW.net_due IS DISTINCT FROM OLD.net_due THEN v_changed := v_changed || 'net_due'; END IF;
    IF NEW.currency IS DISTINCT FROM OLD.currency THEN v_changed := v_changed || 'currency'; END IF;
    IF NEW.hijri_year IS DISTINCT FROM OLD.hijri_year THEN v_changed := v_changed || 'hijri_year'; END IF;
    IF NEW.gregorian_date IS DISTINCT FROM OLD.gregorian_date THEN v_changed := v_changed || 'gregorian_date'; END IF;
    IF NEW.notes IS DISTINCT FROM OLD.notes THEN v_changed := v_changed || 'notes'; END IF;
    IF NEW.snapshot IS DISTINCT FROM OLD.snapshot THEN v_changed := v_changed || 'snapshot'; END IF;
    -- skip audit if only updated_at changed
    IF array_length(v_changed, 1) IS NULL THEN
      RETURN NEW;
    END IF;
    v_payload := jsonb_build_object(
      'changed_fields', to_jsonb(v_changed),
      'before', to_jsonb(OLD),
      'after', to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete_zakat_record';
    v_record_id := OLD.id;
    v_user := COALESCE(auth.uid(), OLD.user_id);
    v_snapshot := OLD.snapshot;
    v_payload := jsonb_build_object('before', to_jsonb(OLD));
  END IF;

  -- Extract fatwa references from snapshot if present
  IF v_snapshot IS NOT NULL THEN
    v_fatwa_ref := v_snapshot #>> '{fatwa_ref, id}';
    IF v_fatwa_ref IS NOT NULL THEN
      v_refs := v_refs || ('FATWA:' || v_fatwa_ref);
    END IF;
    IF jsonb_typeof(v_snapshot -> 'sharia_refs') = 'array' THEN
      v_refs := v_refs || ARRAY(SELECT jsonb_array_elements_text(v_snapshot -> 'sharia_refs'));
    END IF;
  END IF;

  -- Default sharia standards baseline
  IF array_length(v_refs, 1) IS NULL THEN
    v_refs := ARRAY['AAOIFI-35', 'MAJMAA-FIQHI-3/1', 'QURAN-9:60'];
  END IF;

  v_fp := encode(
    digest(
      COALESCE(v_record_id::text,'') || '|' || v_action || '|' ||
      COALESCE((v_payload::text), '') || '|' || COALESCE(v_user::text,''),
      'sha256'
    ),
    'hex'
  );

  INSERT INTO public.sharia_audit_log (
    user_id, zakat_record_id, action, fingerprint, payload, sharia_refs
  ) VALUES (
    v_user, v_record_id, v_action, v_fp, v_payload, v_refs
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- never let audit failure break the underlying operation
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_log_zakat_record_change ON public.zakat_records;
CREATE TRIGGER trg_log_zakat_record_change
AFTER INSERT OR UPDATE OR DELETE ON public.zakat_records
FOR EACH ROW EXECUTE FUNCTION public.log_zakat_record_change();