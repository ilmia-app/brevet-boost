-- Enable pg_net for HTTP calls from Postgres
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function called by the trigger when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text := 'https://lbrbxbgafpljbhcgwylm.supabase.co/functions/v1/send-welcome-email';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxicmJ4YmdhZnBsamJoY2d3eWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODA5NTUsImV4cCI6MjA5MTY1Njk1NX0.4hTSsHbwmMiLsQ0_3tcVfZbitkeki85sLcaFJ6L9_EU';
  v_prenom text;
BEGIN
  -- Skip if no email (shouldn't happen for normal signups)
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Try to extract prenom from raw_user_meta_data if provided at signup
  v_prenom := COALESCE(NEW.raw_user_meta_data->>'prenom', '');

  -- Fire-and-forget HTTP call; failures must not block user creation
  BEGIN
    PERFORM extensions.http_post(
      url := v_url,
      body := jsonb_build_object('email', NEW.email, 'prenom', v_prenom),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'send-welcome-email trigger failed for %: %', NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created_send_welcome ON auth.users;

CREATE TRIGGER on_auth_user_created_send_welcome
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_welcome_email();