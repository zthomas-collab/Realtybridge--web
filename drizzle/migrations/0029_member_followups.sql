CREATE TABLE public.member_followups (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, template)
);
GRANT ALL ON public.member_followups TO service_role;
ALTER TABLE public.member_followups ENABLE ROW LEVEL SECURITY;