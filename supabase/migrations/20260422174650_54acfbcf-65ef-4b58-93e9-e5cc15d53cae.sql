-- 1. Restrict config SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can read config" ON public.config;
CREATE POLICY "Authenticated users can read config"
ON public.config
FOR SELECT
TO authenticated
USING (true);

-- 2. Waitlist: explicit deny-all SELECT + stricter INSERT + uniqueness
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;

CREATE POLICY "No one can read waitlist"
ON public.waitlist
FOR SELECT
TO public
USING (false);

CREATE POLICY "Anyone can join waitlist with valid email"
ON public.waitlist
FOR INSERT
TO public
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 5 AND 254
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- Enforce uniqueness to prevent flooding with the same address
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_unique_idx
ON public.waitlist (lower(email));