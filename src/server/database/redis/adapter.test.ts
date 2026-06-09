import { createClient } from "redis";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ConnectionConfig } from "../types";
import { RedisAdapter } from "./adapter";

vi.mock("redis", () => ({
  createClient: vi.fn()
}));

const createClientMock = vi.mocked(createClient);

const fakeConfig: ConnectionConfig = {
  database: 0,
  id: "session:test",
  label: "Fake Redis",
  provider: "redis",
  source: "session",
  url: "redis://localhost:6379"
};

describe("RedisAdapter", () => {
  beforeEach(() => {
    createClientMock.mockReset();
  });

  it("does not expose namespace nodes for keys that vanished after scan", async () => {
    const client = createMockRedisClient({
      exists: vi.fn(async (key: string) => (key === "user:alive" ? 1 : 0)),
      scan: vi.fn(async () => ({
        cursor: "0",
        keys: ["user:alive", "user:ghost", "user:ghost:child"]
      }))
    });
    createClientMock.mockReturnValue(client);

    const result = await new RedisAdapter().listNamespaces(fakeConfig, {
      path: ["user"]
    });

    expect(result.nodes).toEqual([
      {
        depth: 1,
        hasChildren: false,
        id: "user:alive",
        kind: "record",
        label: "alive",
        path: ["user", "alive"],
        resourceId: "user%3Aalive"
      }
    ]);
  });

  it("does not list resources that disappear before they are described", async () => {
    const client = createMockRedisClient({
      scan: vi.fn(async () => ({
        cursor: "0",
        keys: ["user:alive", "user:ghost"]
      })),
      ttl: vi.fn(async (key: string) => (key === "user:ghost" ? -2 : -1)),
      type: vi.fn(async (key: string) =>
        key === "user:ghost" ? "none" : "string"
      )
    });
    createClientMock.mockReturnValue(client);

    const result = await new RedisAdapter().listResources(fakeConfig, {
      namespace: ["user"],
      scope: "children"
    });

    expect(result.resources).toEqual([
      {
        id: "user%3Aalive",
        kind: "key",
        name: "user:alive",
        path: ["user", "alive"],
        provider: "redis",
        ttlSeconds: -1,
        type: "string"
      }
    ]);
  });
});

function createMockRedisClient(
  overrides: Partial<{
    exists: (key: string) => Promise<number>;
    scan: (
      cursor: string,
      options: { COUNT: number; MATCH: string; TYPE?: string }
    ) => Promise<{ cursor: number | string; keys: string[] }>;
    ttl: (key: string) => Promise<number>;
    type: (key: string) => Promise<string>;
  }> = {}
) {
  return {
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    exists: vi.fn(async () => 1),
    get: vi.fn(async () => null),
    hGetAll: vi.fn(async () => ({})),
    info: vi.fn(async () => "redis_version:7.2.0\r\n"),
    lLen: vi.fn(async () => 0),
    lRange: vi.fn(async () => []),
    on: vi.fn(),
    ping: vi.fn(async () => "PONG"),
    scan: vi.fn(async () => ({ cursor: "0", keys: [] })),
    sMembers: vi.fn(async () => []),
    ttl: vi.fn(async () => -1),
    type: vi.fn(async () => "string"),
    zRangeWithScores: vi.fn(async () => []),
    ...overrides
  } as never;
}
