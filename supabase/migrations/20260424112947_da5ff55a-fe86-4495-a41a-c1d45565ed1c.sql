-- Pool partagé d'exercices générés par l'IA
CREATE TABLE public.exercices_generes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bloc_id text NOT NULL,
  enonce text NOT NULL,
  corrige text NOT NULL,
  graphique jsonb,
  questions jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_exercices_generes_bloc ON public.exercices_generes(bloc_id);

ALTER TABLE public.exercices_generes ENABLE ROW LEVEL SECURITY;

-- Tout utilisateur authentifié peut lire le pool partagé
CREATE POLICY "Authenticated can read generated exercises"
  ON public.exercices_generes FOR SELECT
  TO authenticated
  USING (true);

-- Tout utilisateur authentifié peut ajouter un exercice au pool (créé par lui)
CREATE POLICY "Authenticated can insert generated exercises"
  ON public.exercices_generes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Historique : quels exercices chaque utilisateur a déjà vus
CREATE TABLE public.exercices_vus (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  exercice_id uuid NOT NULL REFERENCES public.exercices_generes(id) ON DELETE CASCADE,
  vu_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercice_id)
);

CREATE INDEX idx_exercices_vus_user ON public.exercices_vus(user_id);
CREATE INDEX idx_exercices_vus_exercice ON public.exercices_vus(exercice_id);

ALTER TABLE public.exercices_vus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own seen history"
  ON public.exercices_vus FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own seen history"
  ON public.exercices_vus FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
