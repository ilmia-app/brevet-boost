
CREATE TABLE public.completions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bloc_id text NOT NULL REFERENCES public.blocs_examen(id) ON DELETE CASCADE,
  date_completion date NOT NULL DEFAULT current_date,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, bloc_id, date_completion)
);

ALTER TABLE public.completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own completions"
ON public.completions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own completions"
ON public.completions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own completions"
ON public.completions FOR UPDATE
USING (auth.uid() = user_id);
