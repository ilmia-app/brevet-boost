CREATE POLICY "Authenticated users can read qcm"
ON public.qcm
FOR SELECT
TO authenticated
USING (true);