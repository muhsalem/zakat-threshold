-- 1) private schema (not exposed via Data API)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

-- 2) Move org-helpers into private (unchanged bodies)
CREATE OR REPLACE FUNCTION private.is_org_member(_org uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org AND user_id = _user
  )
$$;

CREATE OR REPLACE FUNCTION private.has_org_role(_org uuid, _user uuid, _roles public.org_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org AND user_id = _user AND role = ANY(_roles)
  )
$$;

REVOKE ALL ON FUNCTION private.is_org_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.has_org_role(uuid, uuid, public.org_role[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_org_member(uuid, uuid) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION private.has_org_role(uuid, uuid, public.org_role[]) TO postgres, service_role;

-- 3) Recreate all RLS policies referencing the public helpers
DROP POLICY IF EXISTS "checker decides approval" ON public.zakat_approvals;
DROP POLICY IF EXISTS "maker submits approval" ON public.zakat_approvals;
DROP POLICY IF EXISTS "members read approvals" ON public.zakat_approvals;
DROP POLICY IF EXISTS "owner/admin delete approval" ON public.zakat_approvals;
DROP POLICY IF EXISTS "members read members" ON public.organization_members;
DROP POLICY IF EXISTS "owner/admin delete member" ON public.organization_members;
DROP POLICY IF EXISTS "owner/admin insert member" ON public.organization_members;
DROP POLICY IF EXISTS "owner/admin update member" ON public.organization_members;
DROP POLICY IF EXISTS "members read org" ON public.organizations;
DROP POLICY IF EXISTS "owner delete org" ON public.organizations;
DROP POLICY IF EXISTS "owner/admin update org" ON public.organizations;
DROP POLICY IF EXISTS "org members read org zakat records" ON public.zakat_records;

CREATE POLICY "checker decides approval" ON public.zakat_approvals
  FOR UPDATE USING (private.has_org_role(organization_id, auth.uid(), ARRAY['checker'::org_role,'admin'::org_role,'owner'::org_role]))
  WITH CHECK (private.has_org_role(organization_id, auth.uid(), ARRAY['checker'::org_role,'admin'::org_role,'owner'::org_role]));

CREATE POLICY "maker submits approval" ON public.zakat_approvals
  FOR INSERT WITH CHECK ((maker_id = auth.uid()) AND private.has_org_role(organization_id, auth.uid(), ARRAY['maker'::org_role,'admin'::org_role,'owner'::org_role]));

CREATE POLICY "members read approvals" ON public.zakat_approvals
  FOR SELECT USING (private.is_org_member(organization_id, auth.uid()));

CREATE POLICY "owner/admin delete approval" ON public.zakat_approvals
  FOR DELETE USING (private.has_org_role(organization_id, auth.uid(), ARRAY['owner'::org_role,'admin'::org_role]));

CREATE POLICY "members read members" ON public.organization_members
  FOR SELECT USING (private.is_org_member(organization_id, auth.uid()));

CREATE POLICY "owner/admin delete member" ON public.organization_members
  FOR DELETE USING (private.has_org_role(organization_id, auth.uid(), ARRAY['owner'::org_role,'admin'::org_role]));

CREATE POLICY "owner/admin insert member" ON public.organization_members
  FOR INSERT WITH CHECK (
    private.has_org_role(organization_id, auth.uid(), ARRAY['owner'::org_role,'admin'::org_role])
    OR ((user_id = auth.uid()) AND (role = 'owner'::org_role) AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_members.organization_id AND o.created_by = auth.uid()
    ))
  );

CREATE POLICY "owner/admin update member" ON public.organization_members
  FOR UPDATE USING (private.has_org_role(organization_id, auth.uid(), ARRAY['owner'::org_role,'admin'::org_role]))
  WITH CHECK (private.has_org_role(organization_id, auth.uid(), ARRAY['owner'::org_role,'admin'::org_role]));

CREATE POLICY "members read org" ON public.organizations
  FOR SELECT USING (private.is_org_member(id, auth.uid()));

CREATE POLICY "owner delete org" ON public.organizations
  FOR DELETE USING (private.has_org_role(id, auth.uid(), ARRAY['owner'::org_role]));

CREATE POLICY "owner/admin update org" ON public.organizations
  FOR UPDATE USING (private.has_org_role(id, auth.uid(), ARRAY['owner'::org_role,'admin'::org_role]))
  WITH CHECK (private.has_org_role(id, auth.uid(), ARRAY['owner'::org_role,'admin'::org_role]));

CREATE POLICY "org members read org zakat records" ON public.zakat_records
  FOR SELECT USING ((organization_id IS NOT NULL) AND private.is_org_member(organization_id, auth.uid()));

-- 4) Drop the now-unused public copies
DROP FUNCTION IF EXISTS public.is_org_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.has_org_role(uuid, uuid, public.org_role[]);

-- 5) Convert public.has_role to SECURITY INVOKER
-- Callers only ever check their own auth.uid(); user_roles has a
-- "Users read own roles" SELECT policy, so INVOKER returns correct results
-- for the caller and false for anyone else (safe by default).
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;