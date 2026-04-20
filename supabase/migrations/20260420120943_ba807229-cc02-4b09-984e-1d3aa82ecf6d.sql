-- Enable RLS on all six content/config tables and grant read-only access to authenticated users.
-- No INSERT/UPDATE/DELETE policies = implicit deny for all write operations via PostgREST.

ALTER TABLE public.blocs_examen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read blocs_examen"
  ON public.blocs_examen FOR SELECT TO authenticated USING (true);

ALTER TABLE public.exercices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read exercices"
  ON public.exercices FOR SELECT TO authenticated USING (true);

ALTER TABLE public.methodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read methodes"
  ON public.methodes FOR SELECT TO authenticated USING (true);

ALTER TABLE public.messages_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read messages_feedback"
  ON public.messages_feedback FOR SELECT TO authenticated USING (true);

ALTER TABLE public.moteur_ajustement ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read moteur_ajustement"
  ON public.moteur_ajustement FOR SELECT TO authenticated USING (true);

ALTER TABLE public.parametres_eleve_schema ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read parametres_eleve_schema"
  ON public.parametres_eleve_schema FOR SELECT TO authenticated USING (true);