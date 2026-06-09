import { describe, expect, it } from "vitest";

import {
  computeRemainingTtl,
  describeTtlTier,
  formatRemainingTtl,
  ttlTierOf
} from "./ttl";

const OBSERVED_AT = 1_700_000_000_000;

describe("computeRemainingTtl", () => {
  it("returns undefined when the server reported no TTL", () => {
    expect(computeRemainingTtl(undefined, OBSERVED_AT, OBSERVED_AT)).toBe(
      undefined
    );
  });

  it("returns null for persistent keys regardless of elapsed time", () => {
    expect(
      computeRemainingTtl(-1, OBSERVED_AT, OBSERVED_AT + 90_000)
    ).toBeNull();
  });

  it("counts down by whole elapsed seconds", () => {
    expect(computeRemainingTtl(60, OBSERVED_AT, OBSERVED_AT)).toBe(60);
    expect(computeRemainingTtl(60, OBSERVED_AT, OBSERVED_AT + 999)).toBe(60);
    expect(computeRemainingTtl(60, OBSERVED_AT, OBSERVED_AT + 1000)).toBe(59);
    expect(computeRemainingTtl(60, OBSERVED_AT, OBSERVED_AT + 12_500)).toBe(48);
  });

  it("clamps at zero once the observed TTL has fully elapsed", () => {
    expect(computeRemainingTtl(5, OBSERVED_AT, OBSERVED_AT + 5_000)).toBe(0);
    expect(computeRemainingTtl(5, OBSERVED_AT, OBSERVED_AT + 60_000)).toBe(0);
  });

  it("ignores clock skew where now precedes the observation", () => {
    expect(computeRemainingTtl(5, OBSERVED_AT, OBSERVED_AT - 10_000)).toBe(5);
  });
});

describe("ttlTierOf", () => {
  it("maps remaining seconds onto the color tiers", () => {
    expect(ttlTierOf(undefined)).toBe("unknown");
    expect(ttlTierOf(null)).toBe("persistent");
    expect(ttlTierOf(0)).toBe("expired");
    expect(ttlTierOf(1)).toBe("danger");
    expect(ttlTierOf(15)).toBe("danger");
    expect(ttlTierOf(16)).toBe("warning");
    expect(ttlTierOf(60)).toBe("warning");
    expect(ttlTierOf(61)).toBe("healthy");
  });
});

describe("describeTtlTier", () => {
  it("provides a tooltip for every tier", () => {
    for (const tier of [
      "persistent",
      "healthy",
      "warning",
      "danger",
      "expired",
      "unknown"
    ] as const) {
      expect(describeTtlTier(tier).length).toBeGreaterThan(0);
    }
  });
});

describe("formatRemainingTtl", () => {
  it("formats every remaining state", () => {
    expect(formatRemainingTtl(undefined)).toBe("-");
    expect(formatRemainingTtl(null)).toBe("persistent");
    expect(formatRemainingTtl(0)).toBe("expired");
    expect(formatRemainingTtl(42)).toBe("42s");
  });
});
