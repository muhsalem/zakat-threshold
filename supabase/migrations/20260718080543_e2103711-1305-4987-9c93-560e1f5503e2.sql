UPDATE auth.users
SET encrypted_password = crypt('Demo@2026!', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email IN ('demo.individual@zakat-demo.app','demo.company@zakat-demo.app','demo.auditor@zakat-demo.app');