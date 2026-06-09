import { beforeEach, describe, expect, it } from "vitest";

import {
    forgetRememberedConnection,
    loadRememberedConnections,
    rememberConnection,
    REMEMBERED_CONNECTIONS_KEY,
    REMEMBERED_TTL_MS
} from "./remembered-connections";

const NOW = 1_700_000_000_000;

describe("remembered-connections", () => {
  beforeEach(() => {
    window.localStorage.removeItem(REMEMBERED_CONNECTIONS_KEY);
  });

  it("persists a remembered connection and loads it back", () => {
    rememberConnection(
      { label: "Local", provider: "redis", url: "redis://localhost:6379" },
      NOW
    );

    const entries = loadRememberedConnections(NOW);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      label: "Local",
      provider: "redis",
      url: "redis://localhost:6379",
      expiresAt: NOW + REMEMBERED_TTL_MS
    });
  });

  it("never auto-connects — loading only returns stored metadata", () => {
    rememberConnection(
      { label: "Local", provider: "redis", url: "redis://localhost:6379" },
      NOW
    );

    const entry = loadRememberedConnections(NOW)[0];

    expect(entry).not.toHaveProperty("connected");
    expect(Object.keys(entry ?? {})).not.toContain("session");
  });

  it("drops entries older than seven days when loading", () => {
    rememberConnection(
      { label: "Stale", provider: "redis", url: "redis://stale:6379" },
      NOW
    );

    const afterExpiry = NOW + REMEMBERED_TTL_MS + 1;

    expect(loadRememberedConnections(afterExpiry)).toHaveLength(0);
    expect(window.localStorage.getItem(REMEMBERED_CONNECTIONS_KEY)).toBe("[]");
  });

  it("upserts by url, refreshing expiry while keeping the original createdAt", () => {
    rememberConnection(
      { label: "First", provider: "redis", url: "redis://localhost:6379" },
      NOW
    );
    const later = NOW + 60_000;
    rememberConnection(
      { label: "Renamed", provider: "redis", url: "redis://localhost:6379" },
      later
    );

    const entries = loadRememberedConnections(later);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      createdAt: NOW,
      expiresAt: later + REMEMBERED_TTL_MS,
      label: "Renamed"
    });
  });

  it("forgets a remembered connection by id", () => {
    const entry = rememberConnection(
      { label: "Local", provider: "redis", url: "redis://localhost:6379" },
      NOW
    );

    forgetRememberedConnection(entry!.id, NOW);

    expect(loadRememberedConnections(NOW)).toHaveLength(0);
  });

  it("returns an empty list for malformed storage payloads", () => {
    window.localStorage.setItem(REMEMBERED_CONNECTIONS_KEY, "{ not json");

    expect(loadRememberedConnections(NOW)).toEqual([]);
  });
});
