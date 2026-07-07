-- جدول طلبات العملاء غير المسجّلين (intake_queue)
-- يُملأ عند إرسال النموذج العام قبل تسجيل الدخول
-- المحاسب يراه في لوحته ويستورده كعميل جديد

create table if not exists public.intake_queue (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text,
  kind         text not null default 'individual',
  country      text not null default 'SA',
  madhab       text not null default 'mixed',
  hawl_date    text,
  breakdown    jsonb default '{}',
  notes        text,
  created_via  text default 'intake',
  status       text default 'pending',   -- pending | assigned | done
  assigned_to  uuid references auth.users(id),
  created_at   timestamptz default now()
);

alter table public.intake_queue enable row level security;

-- الأدمن والمحاسب يقرؤون الطلبات
create policy "accountants read intake"
  on public.intake_queue for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin') or
    public.has_role(auth.uid(), 'accountant')
  );

-- الكتابة من service_role فقط (via Edge Function أو Server Function)
create policy "service role inserts intake"
  on public.intake_queue for insert
  to service_role with check (true);

create policy "accountants update intake"
  on public.intake_queue for update
  to authenticated
  using (public.has_role(auth.uid(), 'accountant') or public.has_role(auth.uid(), 'admin'));

create index if not exists intake_queue_status_idx    on public.intake_queue(status);
create index if not exists intake_queue_email_idx     on public.intake_queue(email);
create index if not exists intake_queue_created_idx   on public.intake_queue(created_at desc);
