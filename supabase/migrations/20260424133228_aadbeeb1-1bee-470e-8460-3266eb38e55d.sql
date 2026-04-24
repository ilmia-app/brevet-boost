CREATE TABLE public.sessions_travail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bloc_id TEXT NOT NULL,
  bloc_titre TEXT,
  bloc_matiere TEXT,
  enonce TEXT,
  questions JSONB,
  answers JSONB DEFAULT '{}'::jsonb,
  validated JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  duration_seconds INTEGER DEFAULT 0,
  is_ai_generated BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions_travail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.sessions_travail FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.sessions_travail FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.sessions_travail FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.sessions_travail FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_sessions_travail_user_created
  ON public.sessions_travail(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_sessions_travail_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sessions_travail_updated_at
  BEFORE UPDATE ON public.sessions_travail
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sessions_travail_updated_at();