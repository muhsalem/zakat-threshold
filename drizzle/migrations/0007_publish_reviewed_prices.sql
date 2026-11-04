CREATE OR REPLACE FUNCTION public.sync_reviewed_price_quote() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    INSERT INTO public.public_price_quotes (id,country,city,currency,metal,gold_gram,silver_gram,buyback_gram,source,reviewed_at,created_at)
    VALUES (NEW.id,NEW.country,NEW.city,NEW.currency,NEW.metal,NEW.gold_gram,NEW.silver_gram,NEW.buyback_gram,NEW.source,NEW.reviewed_at,NEW.created_at)
    ON CONFLICT (id) DO UPDATE SET country=EXCLUDED.country,city=EXCLUDED.city,currency=EXCLUDED.currency,metal=EXCLUDED.metal,gold_gram=EXCLUDED.gold_gram,silver_gram=EXCLUDED.silver_gram,buyback_gram=EXCLUDED.buyback_gram,source=EXCLUDED.source,reviewed_at=EXCLUDED.reviewed_at;
  ELSE
    DELETE FROM public.public_price_quotes WHERE id=NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_reviewed_price_quote() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_reviewed_price_quote AFTER INSERT OR UPDATE ON public.price_submissions FOR EACH ROW EXECUTE FUNCTION public.sync_reviewed_price_quote();
ALTER POLICY "subs insert" ON public.price_submissions WITH CHECK (user_id = auth.uid() AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND review_reason IS NULL);
ALTER POLICY "subs review" ON public.price_submissions USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
