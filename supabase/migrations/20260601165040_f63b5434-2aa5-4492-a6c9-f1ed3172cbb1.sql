
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'hawl_reminder',
  title text NOT NULL,
  body text,
  link text,
  zakat_record_id uuid,
  due_date date,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;
CREATE UNIQUE INDEX idx_notifications_dedupe ON public.notifications(user_id, type, zakat_record_id, due_date)
  WHERE zakat_record_id IS NOT NULL AND due_date IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Hawl reminder generator: scans zakat_records and creates reminders
-- 7 days and 1 day before completion of one Hijri year (~354 days) from gregorian_date
CREATE OR REPLACE FUNCTION public.generate_hawl_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
  rec RECORD;
  hawl_date date;
  days_left integer;
BEGIN
  FOR rec IN
    SELECT id, user_id, gregorian_date, currency, zakat_due
    FROM public.zakat_records
    WHERE gregorian_date IS NOT NULL
      AND gregorian_date >= CURRENT_DATE - INTERVAL '400 days'
  LOOP
    hawl_date := rec.gregorian_date + INTERVAL '354 days';
    days_left := hawl_date - CURRENT_DATE;

    IF days_left IN (7, 1, 0) THEN
      INSERT INTO public.notifications (user_id, type, title, body, link, zakat_record_id, due_date)
      VALUES (
        rec.user_id,
        'hawl_reminder',
        CASE
          WHEN days_left = 0 THEN 'حلّ موعد إخراج زكاتك اليوم'
          WHEN days_left = 1 THEN 'تذكير: غداً يحلّ حولُ زكاتك'
          ELSE 'تذكير: يحلّ حولُ زكاتك خلال 7 أيام'
        END,
        'موعد اكتمال الحول: ' || to_char(hawl_date, 'YYYY-MM-DD') ||
          CASE WHEN rec.zakat_due > 0
            THEN ' — قيمة الزكاة المقدّرة: ' || rec.zakat_due::text || ' ' || rec.currency
            ELSE '' END,
        '/history',
        rec.id,
        hawl_date
      )
      ON CONFLICT (user_id, type, zakat_record_id, due_date) DO NOTHING;

      IF FOUND THEN inserted_count := inserted_count + 1; END IF;
    END IF;
  END LOOP;

  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_hawl_reminders() TO service_role;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
