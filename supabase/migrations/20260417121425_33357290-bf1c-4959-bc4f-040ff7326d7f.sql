CREATE TABLE public.exercices_vus (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  exercice_id text NOT NULL,
  bloc_id text NOT NULL,
  vu_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercice_id)
);

ALTER TABLE public.exercices_vus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own seen exercises"
ON public.exercices_vus
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own seen exercises"
ON public.exercices_vus
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own seen exercises"
ON public.exercices_vus
FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_exercices_vus_user_bloc ON public.exercices_vus(user_id, bloc_id);