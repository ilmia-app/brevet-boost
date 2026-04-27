CREATE POLICY "Users can update own generated exercises"
ON public.exercices_generes
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own generated exercises"
ON public.exercices_generes
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);