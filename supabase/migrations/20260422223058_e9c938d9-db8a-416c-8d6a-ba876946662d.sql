ALTER TABLE public.annales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read annales"
ON public.annales
FOR SELECT
TO authenticated
USING (true);