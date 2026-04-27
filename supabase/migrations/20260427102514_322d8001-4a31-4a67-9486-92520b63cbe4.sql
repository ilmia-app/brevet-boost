-- 1) Restrict SELECT on exercices_generes to the owner.
DROP POLICY IF EXISTS "Authenticated can read generated exercises" ON public.exercices_generes;

CREATE POLICY "Users read own generated exercises"
  ON public.exercices_generes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- 2) Revoke EXECUTE on internal SECURITY DEFINER trigger functions.
REVOKE EXECUTE ON FUNCTION public.handle_new_user_welcome_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_sessions_travail_updated_at() FROM PUBLIC, anon, authenticated;