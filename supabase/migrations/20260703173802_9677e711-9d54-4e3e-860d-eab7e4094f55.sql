
UPDATE public.profiles p
SET account_type = 'admin'
FROM auth.users u
WHERE p.user_id = u.id AND lower(u.email) = 'muh.salem7@gmail.com';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _is_master boolean := (lower(NEW.email) = 'muh.salem7@gmail.com');
  _account_type public.account_type;
BEGIN
  IF _is_master THEN
    _account_type := 'admin';
  ELSE
    _account_type := COALESCE((NEW.raw_user_meta_data->>'account_type')::public.account_type, 'individual');
  END IF;

  INSERT INTO public.profiles (user_id, display_name, account_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    _account_type
  );

  IF _is_master THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'accountant')
      ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
