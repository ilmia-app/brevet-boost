import { describe, it, expect } from "vitest";
import {
  getBlocPrefixForMatiere,
  getBlocIdLikePattern,
  cleanEnonce,
  isTechnicalEnonceLine,
} from "./annales";

describe("getBlocPrefixForMatiere", () => {
  it("returns FRA for Français (with accent)", () => {
    expect(getBlocPrefixForMatiere("Français")).toBe("FRA");
  });

  it("returns FRA for francais (no accent, lowercase)", () => {
    expect(getBlocPrefixForMatiere("francais")).toBe("FRA");
  });

  it("returns MAT for Maths", () => {
    expect(getBlocPrefixForMatiere("Maths")).toBe("MAT");
    expect(getBlocPrefixForMatiere("maths")).toBe("MAT");
    expect(getBlocPrefixForMatiere("MATHS")).toBe("MAT");
  });

  it("returns HIS for Histoire", () => {
    expect(getBlocPrefixForMatiere("Histoire")).toBe("HIS");
  });

  it("returns null for unknown matiere", () => {
    expect(getBlocPrefixForMatiere("Inconnu")).toBeNull();
  });

  it("returns null for null/undefined/empty", () => {
    expect(getBlocPrefixForMatiere(null)).toBeNull();
    expect(getBlocPrefixForMatiere(undefined)).toBeNull();
    expect(getBlocPrefixForMatiere("")).toBeNull();
  });
});

describe("getBlocIdLikePattern", () => {
  it("builds 'FRA%' for Français", () => {
    expect(getBlocIdLikePattern("Français")).toBe("FRA%");
  });

  it("builds 'MAT%' for Maths", () => {
    expect(getBlocIdLikePattern("Maths")).toBe("MAT%");
  });

  it("builds 'HIS%' for Histoire", () => {
    expect(getBlocIdLikePattern("Histoire")).toBe("HIS%");
  });

  it("returns null when matiere is missing or unknown", () => {
    expect(getBlocIdLikePattern(null)).toBeNull();
    expect(getBlocIdLikePattern("Inconnu")).toBeNull();
  });
});

describe("isTechnicalEnonceLine", () => {
  it("flags Exercice headers", () => {
    expect(isTechnicalEnonceLine("Exercice 1 – QCM (20 points)")).toBe(true);
    expect(isTechnicalEnonceLine("Exercice 3")).toBe(true);
  });
  it("flags selection / bloc-code notes", () => {
    expect(isTechnicalEnonceLine("sélection des questions relevant de MAT-01")).toBe(true);
    expect(isTechnicalEnonceLine("relevant de MAT-02")).toBe(true);
    expect(isTechnicalEnonceLine("MAT-01")).toBe(true);
    expect(isTechnicalEnonceLine("MAT-01 / MAT-02")).toBe(true);
  });
  it("flags bare bareme lines", () => {
    expect(isTechnicalEnonceLine("(20 points)")).toBe(true);
    expect(isTechnicalEnonceLine("17 points")).toBe(true);
  });
  it("keeps real énoncé content", () => {
    expect(isTechnicalEnonceLine("Question 5 : Un maraîcher a cueilli 408 pommes.")).toBe(false);
    expect(isTechnicalEnonceLine("Calculer le PGCD de 408 et 168.")).toBe(false);
    expect(isTechnicalEnonceLine("")).toBe(false);
  });
});

describe("cleanEnonce", () => {
  it("returns empty string for null/undefined/empty input", () => {
    expect(cleanEnonce(null)).toBe("");
    expect(cleanEnonce(undefined)).toBe("");
    expect(cleanEnonce("")).toBe("");
  });

  it("strips leading technical header lines", () => {
    const raw = [
      "Exercice 1 – QCM (20 points) — sélection des questions relevant de MAT-01",
      "",
      "Question 5 : Un maraîcher a cueilli 408 pommes et 168 poires.",
    ].join("\n");
    expect(cleanEnonce(raw)).toBe(
      "Question 5 : Un maraîcher a cueilli 408 pommes et 168 poires.",
    );
  });

  it("strips technical lines in the middle of the text", () => {
    const raw = [
      "Question 1 : Calculer 2 + 2.",
      "Exercice 2 – 17 points",
      "MAT-02",
      "Question 2 : Résoudre x + 3 = 7.",
      "(20 points)",
      "Question 3 : Tracer la droite.",
    ].join("\n");
    const cleaned = cleanEnonce(raw);
    expect(cleaned).toContain("Question 1");
    expect(cleaned).toContain("Question 2");
    expect(cleaned).toContain("Question 3");
    expect(cleaned).not.toMatch(/Exercice 2/);
    expect(cleaned).not.toMatch(/MAT-02/);
    expect(cleaned).not.toMatch(/\(20 points\)/);
  });

  it("collapses blank-line runs created by removals", () => {
    const raw = [
      "Question 1 : A.",
      "Exercice 2",
      "MAT-02",
      "Question 2 : B.",
    ].join("\n");
    expect(cleanEnonce(raw)).toBe("Question 1 : A.\nQuestion 2 : B.");
  });

  it("preserves énoncé content with numbers and punctuation", () => {
    const raw = "Calculer le PGCD de 408 et 168, puis simplifier 408/168.";
    expect(cleanEnonce(raw)).toBe(raw);
  });
});