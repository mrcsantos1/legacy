import { createClient } from "redis";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ConnectionConfig } from "../types";
import { RedisAdapter } from "./adapter";
import { encodeResourceId } from "./namespace";

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

  it("creates Redis clients with a bounded connection timeout and no reconnect loop", async () => {
    const client = createMockRedisClient();
    createClientMock.mockReturnValue(client);

    await new RedisAdapter().testConnection(fakeConfig);

    expect(createClientMock).toHaveBeenCalledWith({
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: false
      },
      url: "redis://localhost:6379"
    });
  });

  it("returns a failed connection test when Redis cannot be reached", async () => {
    const client = createMockRedisClient({
      connect: vi.fn(async () => {
        throw new Error("connect ECONNREFUSED 127.0.0.1:6379");
      })
    });
    createClientMock.mockReturnValue(client);

    await expect(new RedisAdapter().testConnection(fakeConfig)).resolves.toEqual({
      error: "connect ECONNREFUSED 127.0.0.1:6379",
      ok: false
    });
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

  it("previews a large hash with bounded hScan instead of hGetAll", async () => {
    const hGetAll = vi.fn(async (): Promise<Record<string, string>> => ({}));
    const hScan = vi.fn(async () => ({
      cursor: 42,
      entries: [
        { field: "a", value: "1" },
        { field: "b", value: "2" }
      ]
    }));
    const client = createMockRedisClient({
      hGetAll,
      hLen: vi.fn(async () => 5000),
      hScan,
      ttl: vi.fn(async () => -1),
      type: vi.fn(async () => "hash")
    });
    createClientMock.mockReturnValue(client);

    const result = await new RedisAdapter().inspectResource(
      fakeConfig,
      encodeResourceId("big:hash")
    );

    expect(hGetAll).not.toHaveBeenCalled();
    expect(hScan).toHaveBeenCalledWith("big:hash", "0", { COUNT: 100 });
    expect(result.value).toMatchObject({
      kind: "object",
      value: { a: "1", b: "2" }
    });
    expect(result.value.kind === "object" && result.value.meta).toMatchObject({
      cursor: "42",
      itemCount: 5000,
      truncated: true
    });
  });

  it("previews a large set with bounded sScan instead of sMembers", async () => {
    const sMembers = vi.fn(async (): Promise<string[]> => []);
    const sScan = vi.fn(async () => ({ cursor: 0, members: ["x", "y"] }));
    const client = createMockRedisClient({
      sCard: vi.fn(async () => 3000),
      sMembers,
      sScan,
      ttl: vi.fn(async () => -1),
      type: vi.fn(async () => "set")
    });
    createClientMock.mockReturnValue(client);

    const result = await new RedisAdapter().inspectResource(
      fakeConfig,
      encodeResourceId("big:set")
    );

    expect(sMembers).not.toHaveBeenCalled();
    expect(sScan).toHaveBeenCalledWith("big:set", "0", { COUNT: 100 });
    expect(result.value).toMatchObject({ kind: "list", value: ["x", "y"] });
    expect(result.value.kind === "list" && result.value.meta).toMatchObject({
      itemCount: 3000,
      truncated: true
    });
  });

  it("previews a large string with bounded getRange instead of get", async () => {
    const get = vi.fn(async (): Promise<string | null> => null);
    const getRange = vi.fn(async () => "x".repeat(65536));
    const client = createMockRedisClient({
      get,
      getRange,
      strLen: vi.fn(async () => 200000),
      ttl: vi.fn(async () => -1),
      type: vi.fn(async () => "string")
    });
    createClientMock.mockReturnValue(client);

    const result = await new RedisAdapter().inspectResource(
      fakeConfig,
      encodeResourceId("big:string")
    );

    expect(get).not.toHaveBeenCalled();
    expect(getRange).toHaveBeenCalledWith("big:string", 0, 65535);
    expect(result.value.kind === "scalar" && result.value.meta).toMatchObject({
      byteSize: 200000,
      truncated: true
    });
  });
});

function createMockRedisClient(
  overrides: Partial<{
    connect: () => Promise<void>;
    exists: (key: string) => Promise<number>;
    get: (key: string) => Promise<string | null>;
    getRange: (key: string, start: number, end: number) => Promise<string>;
    hGetAll: (key: string) => Promise<Record<string, string>>;
    hLen: (key: string) => Promise<number>;
    hScan: (
      key: string,
      cursor: string,
      options?: { COUNT?: number; MATCH?: string }
    ) => Promise<{
      cursor: number | string;
      entries: Array<{ field: string; value: string }>;
    }>;
    sCard: (key: string) => Promise<number>;
    sMembers: (key: string) => Promise<string[]>;
    sScan: (
      key: string,
      cursor: string,
      options?: { COUNT?: number; MATCH?: string }
    ) => Promise<{ cursor: number | string; members: string[] }>;
    scan: (
      cursor: string,
      options: { COUNT: number; MATCH: string; TYPE?: string }
    ) => Promise<{ cursor: number | string; keys: string[] }>;
    strLen: (key: string) => Promise<number>;
    ttl: (key: string) => Promise<number>;
    type: (key: string) => Promise<string>;
  }> = {}
) {
  return {
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    exists: vi.fn(async () => 1),
    get: vi.fn(async () => null),
    getRange: vi.fn(async () => ""),
    hGetAll: vi.fn(async () => ({})),
    hLen: vi.fn(async () => 0),
    hScan: vi.fn(async () => ({ cursor: 0, entries: [] })),
    info: vi.fn(async () => "redis_version:7.2.0\r\n"),
    lLen: vi.fn(async () => 0),
    lRange: vi.fn(async () => []),
    on: vi.fn(),
    ping: vi.fn(async () => "PONG"),
    sCard: vi.fn(async () => 0),
    scan: vi.fn(async () => ({ cursor: "0", keys: [] })),
    sMembers: vi.fn(async () => []),
    sScan: vi.fn(async () => ({ cursor: 0, members: [] })),
    strLen: vi.fn(async () => 0),
    ttl: vi.fn(async () => -1),
    type: vi.fn(async () => "string"),
    zCard: vi.fn(async () => 0),
    zRangeWithScores: vi.fn(async () => []),
    ...overrides
  } as never;
}
