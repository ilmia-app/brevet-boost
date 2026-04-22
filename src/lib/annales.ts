/**
 * Maps a `matiere` URL param (case/accents insensitive) to the bloc_id prefix
 * used to filter exercises in the annales detail view.
 * Returns null when the matiere is unknown (no filter should be applied).
 */
export const MATIERE_TO_BLOC_PREFIX: Record<string, string> = {
  maths: "MAT",
  français: "FRA",
  francais: "FRA",
  histoire: "HIS",
  géographie: "GEO",
  geographie: "GEO",
  emc: "EMC",
  physique: "PHY",
  svt: "SVT",
  techno: "TEC",
};

export const getBlocPrefixForMatiere = (matiere: string | null | undefined): string | null => {
  if (!matiere) return null;
  return MATIERE_TO_BLOC_PREFIX[matiere.toLowerCase()] ?? null;
};

/**
 * Builds the PostgREST `like` pattern for filtering bloc_id by matiere prefix.
 * Returns null when no filter should be applied.
 */
export const getBlocIdLikePattern = (matiere: string | null | undefined): string | null => {
  const prefix = getBlocPrefixForMatiere(matiere);
  return prefix ? `${prefix}%` : null;
};