
-- 1) Users table: replace ALL policy with explicit per-action policies
DROP POLICY IF EXISTS "Utilisateur voit ses propres données" ON public.users;

CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
ON public.users FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- 2) Make annales bucket private + authenticated read policy
UPDATE storage.buckets SET public = false WHERE id = 'annales';

DROP POLICY IF EXISTS "Authenticated can read annales" ON storage.objects;
CREATE POLICY "Authenticated can read annales"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'annales');

-- 3) Fix function search_path on handle_new_user_email
CREATE OR REPLACE FUNCTION public.handle_new_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
BEGIN
  PERFORM extensions.http_post(
    url := 'https://lbrbxbgafpljbhcgwylm.supabase.co/functions/v1/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxicmJ4YmdhZnBsamJoY2d3eWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODA5NTUsImV4cCI6MjA5MTY1Njk1NX0.4hTSsHbwmMiLsQ0_3tcVfZbitkeki85sLcaFJ6L9_EU'
    ),
    body := jsonb_build_object('email', NEW.email, 'id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;
