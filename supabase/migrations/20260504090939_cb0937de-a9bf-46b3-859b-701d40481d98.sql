DROP POLICY IF EXISTS "Users can manage own qcm results" ON public.qcm_results;

CREATE POLICY "Users can view own qcm results"
ON public.qcm_results
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own qcm results"
ON public.qcm_results
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own qcm results"
ON public.qcm_results
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own qcm results"
ON public.qcm_results
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);