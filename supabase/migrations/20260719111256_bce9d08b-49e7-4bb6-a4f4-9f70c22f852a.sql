
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS channel_inapp boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS channel_email boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS channel_sms   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_address text,
  ADD COLUMN IF NOT EXISTS phone_e164    text,
  ADD COLUMN IF NOT EXISTS quiet_hours_start smallint,
  ADD COLUMN IF NOT EXISTS quiet_hours_end   smallint,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'ar';

ALTER TABLE public.notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_phone_e164_chk;
ALTER TABLE public.notification_preferences
  ADD CONSTRAINT notification_preferences_phone_e164_chk
  CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{6,14}$');

ALTER TABLE public.notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_lang_chk;
ALTER TABLE public.notification_preferences
  ADD CONSTRAINT notification_preferences_lang_chk
  CHECK (language IN ('ar','en'));
