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

/**
 * Detects "technical" lines that should never be shown to a student in the
 * énoncé display: exercice headers, bloc codes (e.g. MAT-01), internal
 * selection notes, point barèmes, etc. Used by `cleanEnonce`.
 */
export const isTechnicalEnonceLine = (line: string): boolean => {
  const t = line.trim();
  if (!t) return false; // blank lines are handled separately (collapsed)
  // "Exercice 1 ...", "Exercice 2 – QCM (20 points)"
  if (/^exercice\s+\d/i.test(t)) return true;
  // Internal selection notes
  if (/sélection des questions/i.test(t)) return true;
  if (/relevant de\s+[A-Z]{2,4}-\d/i.test(t)) return true;
  // Bare bloc codes: "MAT-01", "MAT-01 / MAT-02", possibly with separators
  if (/^[A-Z]{2,4}-\d{2,}([\s/,–-]+[A-Z]{2,4}-\d{2,})*\s*[:\-–]?\s*$/.test(t)) return true;
  // Lines that are essentially just point barèmes: "(20 points)", "20 points"
  if (/^\(?\s*\d+\s*points?\s*\)?$/i.test(t)) return true;
  return false;
};

/**
 * Cleans an énoncé string for display:
 *  - removes technical lines (exercice headers, bloc codes, selection notes…)
 *    anywhere in the text, not only at the start;
 *  - collapses runs of blank lines created by the removals;
 *  - trims leading/trailing whitespace.
 */
export const cleanEnonce = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const kept = raw
    .split("\n")
    .filter((line) => !isTechnicalEnonceLine(line));
  // Collapse 3+ consecutive blank lines into a single blank line
  const collapsed: string[] = [];
  let blankRun = 0;
  for (const line of kept) {
    if (line.trim() === "") {
      blankRun++;
      if (blankRun <= 1) collapsed.push("");
    } else {
      blankRun = 0;
      collapsed.push(line);
    }
  }
  return collapsed.join("\n").trim();
};