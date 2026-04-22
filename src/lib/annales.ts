/**
 * Maps a `matiere` URL param (case/accents insensitive) to the bloc_id prefixes
 * used to filter exercises in the annales detail view.
 * Some categories regroup multiple prefixes (e.g. Histoire-Géographie = HIS + GEO).
 * Returns null when the matiere is unknown (no filter should be applied).
 */
export const MATIERE_TO_BLOC_PREFIXES: Record<string, string[]> = {
  maths: ["MAT"],
  français: ["FRA"],
  francais: ["FRA"],
  "histoire-géographie": ["HIS", "GEO"],
  "histoire-geographie": ["HIS", "GEO"],
  emc: ["EMC"],
  sciences: ["PHY", "SVT", "TEC"],
};

export const getBlocPrefixesForMatiere = (matiere: string | null | undefined): string[] | null => {
  if (!matiere) return null;
  return MATIERE_TO_BLOC_PREFIXES[matiere.toLowerCase()] ?? null;
};

/**
 * Returns true if the bloc_id matches the given matiere filter.
 */
export const blocMatchesMatiere = (
  blocId: string | null | undefined,
  matiere: string | null | undefined,
): boolean => {
  const prefixes = getBlocPrefixesForMatiere(matiere);
  if (!prefixes) return true;
  if (!blocId) return false;
  return prefixes.some((p) => blocId.startsWith(p));
};

/**
 * Maps a bloc_id to its display "matiere" category (regrouped).
 */
export const matiereForBlocId = (blocId: string | null | undefined): string => {
  if (!blocId) return "Autre";
  if (blocId.startsWith("MAT")) return "Maths";
  if (blocId.startsWith("FRA")) return "Français";
  if (blocId.startsWith("HIS") || blocId.startsWith("GEO")) return "Histoire-Géographie";
  if (blocId.startsWith("EMC")) return "EMC";
  if (blocId.startsWith("PHY") || blocId.startsWith("SVT") || blocId.startsWith("TEC")) return "Sciences";
  return "Autre";
};