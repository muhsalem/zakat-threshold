
CREATE TYPE public.sharia_review_status AS ENUM ('draft','submitted','in_review','changes_requested','approved','rejected','withdrawn');

CREATE TABLE public.sharia_review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zakat_record_id uuid,
  subject_kind text NOT NULL DEFAULT 'zakat_record',
  title text NOT NULL,
  question text,
  madhab text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  sharia_refs text[] NOT NULL DEFAULT '{}',
  status public.sharia_review_status NOT NULL DEFAULT 'draft',
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_note text,
  fingerprint text,
  submitted_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_srr_requester ON public.sharia_review_requests(requester_id, created_at DESC);
CREATE INDEX idx_srr_status ON public.sharia_review_requests(status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.sharia_review_requests TO authenticated;
GRANT ALL ON public.sharia_review_requests TO service_role;
ALTER TABLE public.sharia_review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "requesters read own requests" ON public.sharia_review_requests
  FOR SELECT TO authenticated USING (auth.uid() = requester_id);
CREATE POLICY "reviewers read all requests" ON public.sharia_review_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "requesters create own requests" ON public.sharia_review_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "requesters update own open requests" ON public.sharia_review_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id AND status IN ('draft','submitted','changes_requested'))
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "reviewers update any request" ON public.sharia_review_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.sharia_review_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.sharia_review_requests(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_src_request ON public.sharia_review_comments(request_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sharia_review_comments TO authenticated;
GRANT ALL ON public.sharia_review_comments TO service_role;
ALTER TABLE public.sharia_review_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "requesters read public comments" ON public.sharia_review_comments
  FOR SELECT TO authenticated USING (
    is_internal = false AND EXISTS (
      SELECT 1 FROM public.sharia_review_requests r
      WHERE r.id = request_id AND r.requester_id = auth.uid()
    )
  );
CREATE POLICY "reviewers read all comments" ON public.sharia_review_comments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "requesters add public comments" ON public.sharia_review_comments
  FOR INSERT TO authenticated WITH CHECK (
    author_id = auth.uid() AND is_internal = false AND EXISTS (
      SELECT 1 FROM public.sharia_review_requests r
      WHERE r.id = request_id AND r.requester_id = auth.uid()
    )
  );
CREATE POLICY "reviewers add comments" ON public.sharia_review_comments
  FOR INSERT TO authenticated WITH CHECK (
    author_id = auth.uid() AND (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'))
  );
CREATE POLICY "authors edit own comments" ON public.sharia_review_comments
  FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "authors delete own comments" ON public.sharia_review_comments
  FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE TABLE public.sharia_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.sharia_review_requests(id) ON DELETE CASCADE,
  actor_id uuid,
  event_type text NOT NULL,
  from_status public.sharia_review_status,
  to_status public.sharia_review_status,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sre_request ON public.sharia_review_events(request_id, created_at);

GRANT SELECT ON public.sharia_review_events TO authenticated;
GRANT ALL ON public.sharia_review_events TO service_role;
ALTER TABLE public.sharia_review_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "requesters read own audit trail" ON public.sharia_review_events
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sharia_review_requests r WHERE r.id = request_id AND r.requester_id = auth.uid())
  );
CREATE POLICY "reviewers read all audit trail" ON public.sharia_review_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_srr_updated BEFORE UPDATE ON public.sharia_review_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_src_updated BEFORE UPDATE ON public.sharia_review_comments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.log_sharia_review_request_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.sharia_review_events(request_id, actor_id, event_type, to_status, detail)
    VALUES (NEW.id, auth.uid(), 'created', NEW.status, jsonb_build_object('title', NEW.title));
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.sharia_review_events(request_id, actor_id, event_type, from_status, to_status, detail)
    VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status, NEW.status,
      jsonb_build_object('note', NEW.decision_note, 'reviewer_id', NEW.reviewer_id));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_srr_audit AFTER INSERT OR UPDATE ON public.sharia_review_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_sharia_review_request_event();

CREATE OR REPLACE FUNCTION public.log_sharia_review_comment_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.sharia_review_events(request_id, actor_id, event_type, detail)
  VALUES (NEW.request_id, auth.uid(), 'comment_added',
    jsonb_build_object('is_internal', NEW.is_internal, 'comment_id', NEW.id));
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_src_audit AFTER INSERT ON public.sharia_review_comments
  FOR EACH ROW EXECUTE FUNCTION public.log_sharia_review_comment_event();
