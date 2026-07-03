ALTER PUBLICATION supabase_realtime ADD TABLE public.accountant_clients;
ALTER TABLE public.accountant_clients REPLICA IDENTITY FULL;