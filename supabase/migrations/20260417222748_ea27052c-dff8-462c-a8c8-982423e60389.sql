CREATE POLICY "Users can only delete own completions"
ON public.completions
FOR DELETE
USING (auth.uid() = user_id);