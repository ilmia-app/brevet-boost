/**
 * Maps a `matiere` URL param (case/accents insensitive) to the bloc_id prefix
 * used to filter exercises in the annales detail view.
 * Returns null when the matiere is unknown (no filter should be applied).
 */
export const MATIERE_TO_BLOC_PREFIXES: Record<string, string[]> = {
  maths: ["MAT"],
  français: ["FRA"],
  francais: ["FRA"],
  histoire: ["HIS", "GEO", "EMC"],
  "histoire-géo": ["HIS", "GEO", "EMC"],
  "histoire-geo": ["HIS", "GEO", "EMC"],
  géographie: ["GEO"],
  geographie: ["GEO"],
  emc: ["EMC"],
  sciences: ["PHY", "SVT", "TEC"],
  physique: ["PHY"],
  svt: ["SVT"],
  techno: ["TEC"],
};

export const getBlocPrefixesForMatiere = (
  matiere: string | null | undefined,
): string[] | null => {
  if (!matiere) return null;
  return MATIERE_TO_BLOC_PREFIXES[matiere.toLowerCase()] ?? null;
};

/**
 * Returns the first prefix only (legacy single-prefix usage).
 */
export const getBlocPrefixForMatiere = (matiere: string | null | undefined): string | null => {
  const prefixes = getBlocPrefixesForMatiere(matiere);
  return prefixes && prefixes.length > 0 ? prefixes[0] : null;
};

/**
 * Builds a PostgREST `or` filter expression to match bloc_id starting with
 * any of the matiere's prefixes, e.g. "bloc_id.like.HIS%,bloc_id.like.GEO%".
 * Returns null when no filter should be applied.
 */
export const getBlocIdOrFilter = (matiere: string | null | undefined): string | null => {
  const prefixes = getBlocPrefixesForMatiere(matiere);
  if (!prefixes || prefixes.length === 0) return null;
  return prefixes.map((p) => `bloc_id.like.${p}%`).join(",");
};

/**
 * Legacy single-pattern helper kept for backwards compat (uses first prefix).
 */
export const getBlocIdLikePattern = (matiere: string | null | undefined): string | null => {
  const prefix = getBlocPrefixForMatiere(matiere);
  return prefix ? `${prefix}%` : null;
};

/** Returns true if a bloc_id matches any of the prefixes for the given matiere. */
export const blocIdMatchesMatiere = (
  blocId: string | null | undefined,
  matiere: string | null | undefined,
): boolean => {
  const prefixes = getBlocPrefixesForMatiere(matiere);
  if (!prefixes) return true;
  if (!blocId) return false;
  return prefixes.some((p) => blocId.startsWith(p));
};