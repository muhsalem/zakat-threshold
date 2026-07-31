GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.is_org_member(uuid, uuid) TO authenticated, anon, service_role;