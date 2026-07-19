-- Enforce Segregation of Duties: Checker/Approver cannot be the same user who submitted the approval (Maker)
ALTER TABLE public.zakat_approvals
  ADD CONSTRAINT checker_cannot_be_maker
  CHECK (checker_id IS NULL OR checker_id <> maker_id);

-- Ensure the approval-attachments bucket exists in Supabase storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('approval-attachments', 'approval-attachments', false)
ON CONFLICT (id) DO NOTHING;
