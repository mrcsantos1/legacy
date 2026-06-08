import { describe, expect, it } from "vitest";

import { DatabaseService } from "./service";
import type {
  ConnectionConfig,
  DatabaseAdapter,
  MutationRequest
} from "./types";

const fakeConfig: ConnectionConfig = {
  database: 0,
  id: "session:test",
  label: "Fake Redis",
  provider: "redis",
  source: "session",
  url: "redis://localhost:6379"
};

function createFakeAdapter(): DatabaseAdapter {
  return {
    capabilities: {
      canDelete: true,
      canExpire: true,
      canListNamespaces: true,
      canListResources: true,
      canReadResource: true,
      canRename: true,
      canUpdate: true,
      supportsRawCommand: false,
      supportsSchemas: false,
      supportsTabularRows: false,
      supportsTTL: true
    },
    async inspectResource(_config, resourceId) {
      return {
        metadata: { ttlSeconds: 120 },
        resource: {
          id: resourceId,
          kind: "key",
          name: "user:1",
          path: ["user", "1"],
          provider: "redis",
          ttlSeconds: 120,
          type: "string"
        },
        value: {
          encoding: "utf8",
          kind: "scalar",
          value: "Ada"
        }
      };
    },
    async listNamespaces() {
      return {
        cursor: "0",
        nodes: [
          {
            depth: 0,
            hasChildren: true,
            id: "user",
            label: "user",
            path: ["user"]
          }
        ]
      };
    },
    async listResources() {
      return {
        cursor: "0",
        resources: [
          {
            id: "user%3A1",
            kind: "key",
            name: "user:1",
            path: ["user", "1"],
            provider: "redis",
            type: "string"
          }
        ]
      };
    },
    async mutate(_config, request: MutationRequest) {
      return {
        changedResourceIds: [request.resourceId ?? "user%3A1"],
        status: "success"
      };
    },
    async testConnection() {
      return { ok: true };
    }
  };
}

describe("DatabaseService", () => {
  it("delegates generic operations to the adapter selected by provider", async () => {
    const service = new DatabaseService({
      getAdapter: () => createFakeAdapter()
    });

    await expect(
      service.listResources(fakeConfig, { cursor: "0", namespace: ["user"] })
    ).resolves.toMatchObject({
      resources: [{ name: "user:1", provider: "redis" }]
    });

    await expect(service.inspectResource(fakeConfig, "user%3A1")).resolves.toMatchObject({
      value: { value: "Ada" }
    });
  });
});
