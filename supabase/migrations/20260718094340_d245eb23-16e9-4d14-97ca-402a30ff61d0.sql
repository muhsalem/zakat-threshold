-- 1) جدول تفضيلات الإشعارات
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hawl_reminder_enabled boolean NOT NULL DEFAULT true,
  hawl_reminder_days integer[] NOT NULL DEFAULT ARRAY[7, 1, 0]::integer[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification preferences"
  ON public.notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER notification_preferences_touch_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) تحديث دالة توليد تذكيرات الحول لاحترام تفضيلات المستخدم
CREATE OR REPLACE FUNCTION public.generate_hawl_reminders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inserted_count integer := 0;
  rec RECORD;
  hawl_date date;
  days_left integer;
  pref_enabled boolean;
  pref_days integer[];
BEGIN
  FOR rec IN
    SELECT id, user_id, gregorian_date, currency, zakat_due
    FROM public.zakat_records
    WHERE gregorian_date IS NOT NULL
      AND gregorian_date >= CURRENT_DATE - INTERVAL '400 days'
  LOOP
    -- اقرأ التفضيلات (أو استخدم الافتراضي)
    SELECT hawl_reminder_enabled, hawl_reminder_days
      INTO pref_enabled, pref_days
      FROM public.notification_preferences
      WHERE user_id = rec.user_id;

    IF pref_enabled IS NULL THEN
      pref_enabled := true;
      pref_days := ARRAY[7, 1, 0];
    END IF;

    IF NOT pref_enabled THEN
      CONTINUE;
    END IF;

    hawl_date := rec.gregorian_date + INTERVAL '354 days';
    days_left := hawl_date - CURRENT_DATE;

    IF days_left = ANY(pref_days) THEN
      INSERT INTO public.notifications (user_id, type, title, body, link, zakat_record_id, due_date)
      VALUES (
        rec.user_id,
        'hawl_reminder',
        CASE
          WHEN days_left = 0 THEN 'حلّ موعد إخراج زكاتك اليوم'
          WHEN days_left = 1 THEN 'تذكير: غداً يحلّ حولُ زكاتك'
          ELSE 'تذكير: يحلّ حولُ زكاتك خلال ' || days_left::text || ' أيام'
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
$function$;