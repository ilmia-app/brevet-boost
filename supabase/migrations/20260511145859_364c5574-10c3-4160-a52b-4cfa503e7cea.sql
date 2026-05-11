ALTER TABLE public.exercices_bibliotheque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read exercices_bibliotheque"
ON public.exercices_bibliotheque
FOR SELECT
TO anon, authenticated
USING (true);