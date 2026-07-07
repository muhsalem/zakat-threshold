-- جدول المدفوعات — يربط Stripe بالمستخدمين وخططهم
create table if not exists public.payments (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references auth.users(id) on delete set null,
  stripe_session_id      text unique,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan_id                text not null,
  status                 text not null default 'pending',   -- pending | paid | active | cancelled | refunded
  amount_paid            numeric(12,2),
  currency               text default 'usd',
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- إضافة عمود plan لجدول profiles إذا لم يكن موجوداً
alter table public.profiles
  add column if not exists plan            text    default 'free',
  add column if not exists plan_expires_at timestamptz;

-- RLS
alter table public.payments enable row level security;

-- المستخدم يرى مدفوعاته فقط
create policy "user sees own payments"
  on public.payments for select
  to authenticated
  using (auth.uid() = user_id);

-- فقط خدمة Supabase (service role) تكتب — عبر الـ Webhook
create policy "service role inserts payments"
  on public.payments for insert
  to service_role
  with check (true);

create policy "service role updates payments"
  on public.payments for update
  to service_role
  using (true);

-- الأدمن يرى كل المدفوعات
create policy "admins read all payments"
  on public.payments for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- index للبحث السريع بـ Stripe IDs
create index if not exists payments_stripe_session_idx  on public.payments(stripe_session_id);
create index if not exists payments_stripe_customer_idx on public.payments(stripe_customer_id);
create index if not exists payments_user_id_idx         on public.payments(user_id);

-- دالة مساعدة: هل المستخدم لديه خطة فعالة؟
create or replace function public.user_plan(uid uuid)
returns text
language sql stable security definer
as $$
  select coalesce(
    (select plan from public.profiles
     where id = uid
       and (plan_expires_at is null or plan_expires_at > now())
     limit 1),
    'free'
  );
$$;
