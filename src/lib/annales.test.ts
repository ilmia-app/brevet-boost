import { describe, it, expect } from "vitest";
import { getBlocPrefixesForMatiere, blocMatchesMatiere, matiereForBlocId } from "./annales";

describe("getBlocPrefixesForMatiere", () => {
  it("returns [MAT] for Maths", () => {
    expect(getBlocPrefixesForMatiere("Maths")).toEqual(["MAT"]);
  });
  it("returns [FRA] for Français (with or without accent)", () => {
    expect(getBlocPrefixesForMatiere("Français")).toEqual(["FRA"]);
    expect(getBlocPrefixesForMatiere("francais")).toEqual(["FRA"]);
  });
  it("returns [HIS, GEO] for Histoire-Géographie", () => {
    expect(getBlocPrefixesForMatiere("Histoire-Géographie")).toEqual(["HIS", "GEO"]);
    expect(getBlocPrefixesForMatiere("histoire-geographie")).toEqual(["HIS", "GEO"]);
  });
  it("returns [PHY, SVT, TEC] for Sciences", () => {
    expect(getBlocPrefixesForMatiere("Sciences")).toEqual(["PHY", "SVT", "TEC"]);
  });
  it("returns null for unknown / empty", () => {
    expect(getBlocPrefixesForMatiere("Inconnu")).toBeNull();
    expect(getBlocPrefixesForMatiere(null)).toBeNull();
    expect(getBlocPrefixesForMatiere(undefined)).toBeNull();
    expect(getBlocPrefixesForMatiere("")).toBeNull();
  });
});

describe("blocMatchesMatiere", () => {
  it("matches HIS-01 and GEO-02 against Histoire-Géographie", () => {
    expect(blocMatchesMatiere("HIS-01", "Histoire-Géographie")).toBe(true);
    expect(blocMatchesMatiere("GEO-02", "Histoire-Géographie")).toBe(true);
    expect(blocMatchesMatiere("MAT-01", "Histoire-Géographie")).toBe(false);
  });
  it("matches PHY/SVT/TEC against Sciences", () => {
    expect(blocMatchesMatiere("PHY-01", "Sciences")).toBe(true);
    expect(blocMatchesMatiere("SVT-01", "Sciences")).toBe(true);
    expect(blocMatchesMatiere("TEC-01", "Sciences")).toBe(true);
    expect(blocMatchesMatiere("FRA-01", "Sciences")).toBe(false);
  });
  it("returns true when no matiere filter is provided", () => {
    expect(blocMatchesMatiere("MAT-01", null)).toBe(true);
    expect(blocMatchesMatiere("MAT-01", undefined)).toBe(true);
  });
});

describe("matiereForBlocId", () => {
  it("regroups HIS and GEO into Histoire-Géographie", () => {
    expect(matiereForBlocId("HIS-01")).toBe("Histoire-Géographie");
    expect(matiereForBlocId("GEO-02")).toBe("Histoire-Géographie");
  });
  it("regroups PHY, SVT, TEC into Sciences", () => {
    expect(matiereForBlocId("PHY-01")).toBe("Sciences");
    expect(matiereForBlocId("SVT-01")).toBe("Sciences");
    expect(matiereForBlocId("TEC-01")).toBe("Sciences");
  });
  it("maps MAT/FRA/EMC to their own categories", () => {
    expect(matiereForBlocId("MAT-01")).toBe("Maths");
    expect(matiereForBlocId("FRA-01")).toBe("Français");
    expect(matiereForBlocId("EMC-01")).toBe("EMC");
  });
});