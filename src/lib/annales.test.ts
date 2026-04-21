import { describe, it, expect } from "vitest";
import { getBlocPrefixForMatiere, getBlocIdLikePattern } from "./annales";

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