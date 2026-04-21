
-- Table config
CREATE TABLE public.config (
  cle text PRIMARY KEY,
  valeur text
);

ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read config"
ON public.config
FOR SELECT
USING (true);

INSERT INTO public.config (cle, valeur) VALUES ('max_inscriptions_gratuites', '20');

-- Table waitlist
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist"
ON public.waitlist
FOR INSERT
WITH CHECK (true);
