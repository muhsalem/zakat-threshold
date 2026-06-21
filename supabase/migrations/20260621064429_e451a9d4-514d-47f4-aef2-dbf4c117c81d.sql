
-- =========================================================
-- WAVE 2: Multi-Tenant + Maker-Checker
-- =========================================================

-- 1) Enum: organization role
CREATE TYPE public.org_role AS ENUM ('owner','admin','maker','checker','auditor','viewer');

-- 2) Enum: approval status
CREATE TYPE public.approval_status AS ENUM ('pending','approved','rejected');

-- =========================================================
-- organizations
-- =========================================================
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  registration_no text,
  country text,
  currency text NOT NULL DEFAULT 'SAR',
  sector text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_organizations_updated
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- organization_members
-- =========================================================
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Security-definer helpers (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org AND user_id = _user
  )
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_org uuid, _user uuid, _roles public.org_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org AND user_id = _user AND role = ANY(_roles)
  )
$$;

-- Organizations policies
CREATE POLICY "members read org"
ON public.organizations FOR SELECT TO authenticated
USING (public.is_org_member(id, auth.uid()));

CREATE POLICY "creator inserts org"
ON public.organizations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "owner/admin update org"
ON public.organizations FOR UPDATE TO authenticated
USING (public.has_org_role(id, auth.uid(), ARRAY['owner','admin']::public.org_role[]))
WITH CHECK (public.has_org_role(id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE POLICY "owner delete org"
ON public.organizations FOR DELETE TO authenticated
USING (public.has_org_role(id, auth.uid(), ARRAY['owner']::public.org_role[]));

-- Members policies
CREATE POLICY "members read members"
ON public.organization_members FOR SELECT TO authenticated
USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "owner/admin insert member"
ON public.organization_members FOR INSERT TO authenticated
WITH CHECK (
  public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (
    -- bootstrap: creator adds themselves as owner
    user_id = auth.uid()
    AND role = 'owner'
    AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.created_by = auth.uid())
  )
);

CREATE POLICY "owner/admin update member"
ON public.organization_members FOR UPDATE TO authenticated
USING (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]))
WITH CHECK (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE POLICY "owner/admin delete member"
ON public.organization_members FOR DELETE TO authenticated
USING (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

-- =========================================================
-- zakat_approvals (Maker-Checker)
-- =========================================================
CREATE TABLE public.zakat_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  zakat_record_id uuid REFERENCES public.zakat_records(id) ON DELETE SET NULL,
  title text NOT NULL,
  snapshot jsonb NOT NULL,
  fingerprint text,
  status public.approval_status NOT NULL DEFAULT 'pending',
  maker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checker_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  checker_note text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zakat_approvals TO authenticated;
GRANT ALL ON public.zakat_approvals TO service_role;
ALTER TABLE public.zakat_approvals ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_zakat_approvals_updated
BEFORE UPDATE ON public.zakat_approvals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Members read approvals; makers submit; checkers decide
CREATE POLICY "members read approvals"
ON public.zakat_approvals FOR SELECT TO authenticated
USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "maker submits approval"
ON public.zakat_approvals FOR INSERT TO authenticated
WITH CHECK (
  maker_id = auth.uid()
  AND public.has_org_role(organization_id, auth.uid(), ARRAY['maker','admin','owner']::public.org_role[])
);

CREATE POLICY "checker decides approval"
ON public.zakat_approvals FOR UPDATE TO authenticated
USING (public.has_org_role(organization_id, auth.uid(), ARRAY['checker','admin','owner']::public.org_role[]))
WITH CHECK (public.has_org_role(organization_id, auth.uid(), ARRAY['checker','admin','owner']::public.org_role[]));

CREATE POLICY "owner/admin delete approval"
ON public.zakat_approvals FOR DELETE TO authenticated
USING (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

-- =========================================================
-- Link zakat_records to organizations (optional)
-- =========================================================
ALTER TABLE public.zakat_records
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_zakat_records_org ON public.zakat_records(organization_id);

CREATE POLICY "org members read org zakat records"
ON public.zakat_records FOR SELECT TO authenticated
USING (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid()));
