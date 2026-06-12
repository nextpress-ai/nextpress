import { describe, expect, it } from "vitest";
import {
  normalizeIconQuery,
  scoreIconNameMatch,
  searchIconNames,
} from "@/lib/icon-indexes/fuzzy-icon-search";

describe("fuzzy-icon-search", () => {
  it("normalizes separators for cross-format matching", () => {
    expect(normalizeIconQuery("arrow-right")).toBe("arrowright");
    expect(normalizeIconQuery("arrow right")).toBe("arrowright");
  });

  it("prefers exact and prefix matches", () => {
    expect(scoreIconNameMatch({ query: "home", name: "home" })).toBeGreaterThan(
      scoreIconNameMatch({ query: "home", name: "home-alt" }),
    );
    expect(scoreIconNameMatch({ query: "arr", name: "arrow-right" })).toBeGreaterThan(0);
  });

  it("matches kebab-case when query uses spaces", () => {
    const score = scoreIconNameMatch({ query: "arrow right", name: "arrow-right" });
    expect(score).toBeGreaterThan(600);
  });

  it("returns ranked hits capped by limit", () => {
    const hits = searchIconNames({
      names: ["star", "stars", "start", "home", "arrow-right"],
      query: "star",
      limit: 2,
    });
    expect(hits).toHaveLength(2);
    expect(hits[0]?.name).toBe("star");
  });

  it("returns empty for blank query", () => {
    expect(searchIconNames({ names: ["star"], query: "  ", limit: 10 })).toEqual([]);
  });
});
