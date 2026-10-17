import { describe, expect, it } from "vitest";
import {
  formatTypeBadges,
  renderStat,
  TYPE_BADGES,
} from "../../../src/features/common/pokemonFormat.js";

describe("pokemonFormat", () => {
  it("decorates known types and passes through unknown ones", () => {
    expect(formatTypeBadges(["fire", "flying"])).toBe("🔥 Fire / 🦅 Flying");
    expect(formatTypeBadges(["FIRE"])).toBe("🔥 Fire");
    expect(formatTypeBadges(["mystery"])).toBe("mystery");
    expect(formatTypeBadges([])).toBe("");
  });

  it("exposes a badge for every canonical type", () => {
    for (const type of ["normal", "fire", "water", "electric", "grass", "dark"]) {
      expect(TYPE_BADGES[type]).toBeDefined();
    }
  });

  it("renders stat bars clamped between one and ten blocks", () => {
    const full = renderStat("HP", 150);
    expect(full.endsWith("150")).toBe(true);
    expect(full.split("█").length - 1).toBe(10);
    expect(full).not.toContain("░");

    const zero = renderStat("Speed", 0);
    expect(zero.endsWith("  0")).toBe(true);
    expect(zero.split("█").length - 1).toBe(1);
    expect(zero.split("░").length - 1).toBe(9);
  });
});
