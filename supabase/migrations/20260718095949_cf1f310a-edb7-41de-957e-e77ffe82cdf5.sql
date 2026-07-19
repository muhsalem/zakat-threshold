CREATE OR REPLACE FUNCTION public.enforce_sod_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.checker_id IS NOT NULL AND NEW.checker_id = NEW.maker_id THEN
    RAISE EXCEPTION 'SoD violation: checker_id (%) cannot equal maker_id (%). فصل المهام مطلوب.', NEW.checker_id, NEW.maker_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_sod_on_approval ON public.zakat_approvals;
CREATE TRIGGER trg_enforce_sod_on_approval
BEFORE INSERT OR UPDATE OF checker_id, maker_id ON public.zakat_approvals
FOR EACH ROW EXECUTE FUNCTION public.enforce_sod_on_approval();