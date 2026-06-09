import { createClient } from "redis";

import { NotFoundError, ValidationError } from "../errors";
import type {
  ConnectionConfig,
  ConnectionTestResult,
  DatabaseAdapter,
  DataPreview,
  MutationRequest,
  NamespaceListQuery,
  ResourceDescriptor,
  ResourceInspection,
  ResourceInspectionQuery,
  ResourceListQuery
} from "../types";
import {
  decodeResourceId,
  deriveNamespaceNodes,
  encodeResourceId,
  filterResourceKeysByScope,
  keyToPath,
  namespacePathToMatchPattern
} from "./namespace";

interface RedisClientLike {
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<boolean | number>;
  get(key: string): Promise<string | null>;
  getRange(key: string, start: number, end: number): Promise<string>;
  hGetAll(key: string): Promise<Record<string, string>>;
  hLen(key: string): Promise<number>;
  hScan(
    key: string,
    cursor: string,
    options?: { COUNT?: number; MATCH?: string }
  ): Promise<{ cursor: number | string; entries: Array<{ field: string; value: string }> }>;
  info(section?: string): Promise<string>;
  lLen(key: string): Promise<number>;
  lRange(key: string, start: number, stop: number): Promise<string[]>;
  ping(): Promise<string>;
  rename(key: string, newKey: string): Promise<string>;
  sCard(key: string): Promise<number>;
  sMembers(key: string): Promise<string[]>;
  sScan(
    key: string,
    cursor: string,
    options?: { COUNT?: number; MATCH?: string }
  ): Promise<{ cursor: number | string; members: string[] }>;
  scan(
    cursor: string,
    options: { COUNT: number; MATCH: string; TYPE?: string }
  ): Promise<{ cursor: number | string; keys: string[] }>;
  set(key: string, value: string): Promise<string | null>;
  strLen(key: string): Promise<number>;
  ttl(key: string): Promise<number>;
  type(key: string): Promise<string>;
  zCard(key: string): Promise<number>;
  zRangeWithScores(
    key: string,
    start: number,
    stop: number
  ): Promise<Array<{ score: number; value: string }>>;
}

const DEFAULT_DELIMITER = ":";
const DEFAULT_SCAN_COUNT = 100;
const DEFAULT_PREVIEW_LIMIT = 100;
const MAX_PREVIEW_LIMIT = 1000;
const DEFAULT_PREVIEW_BYTES = 64 * 1024;
const MAX_PREVIEW_BYTES = 1024 * 1024;

export class RedisAdapter implements DatabaseAdapter {
  readonly capabilities = {
    canDelete: true,
    canExpire: true,
    canListNamespaces: true,
    canListResources: true,
    canReadResource: true,
    canRename: true,
    canUpdate: true,
    supportsRawCommand: false,
    supportsSchemas: false,
    supportsTTL: true,
    supportsTabularRows: false
  };

  async inspectResource(
    config: ConnectionConfig,
    resourceId: string,
    query?: ResourceInspectionQuery
  ): Promise<ResourceInspection> {
    return this.withClient(config, async (client) => {
      const key = decodeResourceId(resourceId);
      const exists = await client.exists(key);

      if (exists === 0) {
        throw new NotFoundError(`Redis key not found: ${key}`);
      }

      const resource = await this.describeKey(client, key, DEFAULT_DELIMITER);
      if (!resource) {
        throw new NotFoundError(`Redis key not found: ${key}`);
      }

      const value = await this.readValue(client, key, resource.type, query);

      return {
        metadata: {
          ttlSeconds: resource.ttlSeconds,
          type: resource.type
        },
        resource,
        value
      };
    });
  }

  async listNamespaces(
    config: ConnectionConfig,
    query: NamespaceListQuery
  ) {
    return this.withClient(config, async (client) => {
      const delimiter = query.delimiter ?? DEFAULT_DELIMITER;
      const path = query.path ?? [];
      const scanResult = await this.scan(client, {
        count: query.count,
        cursor: query.cursor,
        match: namespacePathToMatchPattern(path, delimiter)
      });
      const existingKeys = await this.filterExistingKeys(client, scanResult.keys);

      return {
        cursor: scanResult.cursor,
        nodes: deriveNamespaceNodes({
          delimiter,
          keys: existingKeys,
          path
        })
      };
    });
  }

  async listResources(config: ConnectionConfig, query: ResourceListQuery) {
    return this.withClient(config, async (client) => {
      const delimiter = query.delimiter ?? DEFAULT_DELIMITER;
      const namespace = query.namespace ?? [];
      const match = buildResourceMatchPattern(namespace, query.search, delimiter);
      const scanResult = await this.scan(client, {
        count: query.count,
        cursor: query.cursor,
        match,
        type: query.type
      });
      const scopedKeys = filterResourceKeysByScope({
        delimiter,
        keys: scanResult.keys,
        namespace,
        scope: query.scope ?? "descendants"
      });
      const describedResources = await Promise.all(
        scopedKeys.map((key) => this.describeKey(client, key, delimiter))
      );

      return {
        cursor: scanResult.cursor,
        resources: describedResources.filter(isResourceDescriptor)
      };
    });
  }

  async mutate(config: ConnectionConfig, request: MutationRequest) {
    return this.withClient(config, async (client) => {
      switch (request.action) {
        case "create": {
          if (!request.name) {
            throw new ValidationError("Create mutations require a name.");
          }

          await client.set(request.name, serializeMutationValue(request.value));

          if (request.ttlSeconds !== undefined) {
            await client.expire(request.name, request.ttlSeconds);
          }

          return {
            changedResourceIds: [encodeResourceId(request.name)],
            status: "success" as const
          };
        }
        case "delete": {
          const key = requireResourceKey(request);
          await client.del(key);
          return {
            changedResourceIds: [encodeResourceId(key)],
            status: "success" as const
          };
        }
        case "expire": {
          const key = requireResourceKey(request);

          if (request.ttlSeconds === undefined) {
            throw new ValidationError("Expire mutations require ttlSeconds.");
          }

          await client.expire(key, request.ttlSeconds);
          return {
            changedResourceIds: [encodeResourceId(key)],
            status: "success" as const
          };
        }
        case "rename": {
          const key = requireResourceKey(request);

          if (!request.newName) {
            throw new ValidationError("Rename mutations require newName.");
          }

          await client.rename(key, request.newName);
          return {
            changedResourceIds: [
              encodeResourceId(key),
              encodeResourceId(request.newName)
            ],
            status: "success" as const
          };
        }
        case "update": {
          const key = requireResourceKey(request);
          await client.set(key, serializeMutationValue(request.value));
          return {
            changedResourceIds: [encodeResourceId(key)],
            status: "success" as const
          };
        }
      }
    });
  }

  async testConnection(config: ConnectionConfig): Promise<ConnectionTestResult> {
    try {
      return await this.withClient(config, async (client) => {
        await client.ping();
        const info = await client.info("server");
        const version = info.match(/redis_version:(.+)\r?\n/)?.[1]?.trim();

        return {
          ok: true,
          serverVersion: version
        };
      });
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown Redis error",
        ok: false
      };
    }
  }

  private async describeKey(
    client: RedisClientLike,
    key: string,
    delimiter: string
  ): Promise<ResourceDescriptor | null> {
    const [type, ttlSeconds] = await Promise.all([client.type(key), client.ttl(key)]);

    if (type === "none" || ttlSeconds === -2) {
      return null;
    }

    return {
      id: encodeResourceId(key),
      kind: "key",
      name: key,
      path: keyToPath(key, delimiter),
      provider: "redis",
      ttlSeconds,
      type
    };
  }

  private async readValue(
    client: RedisClientLike,
    key: string,
    type: string,
    query?: ResourceInspectionQuery
  ): Promise<DataPreview> {
    const limit = clamp(
      query?.limit ?? DEFAULT_PREVIEW_LIMIT,
      1,
      MAX_PREVIEW_LIMIT
    );
    const bytes = clamp(
      query?.bytes ?? DEFAULT_PREVIEW_BYTES,
      1,
      MAX_PREVIEW_BYTES
    );
    const startCursor = query?.cursor ?? "0";

    switch (type) {
      case "string": {
        const byteSize = await client.strLen(key);
        const value =
          byteSize === 0 ? "" : await client.getRange(key, 0, bytes - 1);
        return {
          encoding: "utf8",
          kind: "scalar",
          meta: {
            byteSize,
            displayHint: "text",
            truncated: byteSize > bytes
          },
          value
        };
      }
      case "hash": {
        const itemCount = await client.hLen(key);
        const result = await client.hScan(key, startCursor, { COUNT: limit });
        const value: Record<string, string> = {};
        for (const entry of result.entries.slice(0, limit)) {
          value[entry.field] = entry.value;
        }
        const nextCursor = String(result.cursor);
        const done = nextCursor === "0";
        return {
          kind: "object",
          meta: {
            cursor: done ? undefined : nextCursor,
            displayHint: "json",
            itemCount,
            truncated: !done || itemCount > Object.keys(value).length
          },
          value
        };
      }
      case "list": {
        const itemCount = await client.lLen(key);
        const value = await client.lRange(key, 0, limit - 1);
        return {
          kind: "list",
          length: itemCount,
          meta: {
            displayHint: "list",
            itemCount,
            truncated: itemCount > value.length
          },
          value
        };
      }
      case "set": {
        const itemCount = await client.sCard(key);
        const result = await client.sScan(key, startCursor, { COUNT: limit });
        const value = result.members.slice(0, limit);
        const nextCursor = String(result.cursor);
        const done = nextCursor === "0";
        return {
          kind: "list",
          length: itemCount,
          meta: {
            cursor: done ? undefined : nextCursor,
            displayHint: "list",
            itemCount,
            truncated: !done || itemCount > value.length
          },
          value
        };
      }
      case "zset": {
        const itemCount = await client.zCard(key);
        const value = await client.zRangeWithScores(key, 0, limit - 1);
        return {
          kind: "zset",
          meta: {
            displayHint: "table",
            itemCount,
            truncated: itemCount > value.length
          },
          value
        };
      }
      default:
        return {
          kind: "unsupported",
          message: `Preview for Redis type "${type}" is not supported yet.`
        };
    }
  }

  private async scan(
    client: RedisClientLike,
    input: {
      readonly count?: number;
      readonly cursor?: string;
      readonly match: string;
      readonly type?: string;
    }
  ): Promise<{ cursor: string; keys: string[] }> {
    const result = await client.scan(input.cursor ?? "0", {
      COUNT: input.count ?? DEFAULT_SCAN_COUNT,
      MATCH: input.match,
      TYPE: input.type
    });

    return {
      cursor: String(result.cursor),
      keys: result.keys
    };
  }

  private async filterExistingKeys(
    client: RedisClientLike,
    keys: string[]
  ): Promise<string[]> {
    const existenceChecks = await Promise.all(
      keys.map(async (key) => ({
        exists: (await client.exists(key)) > 0,
        key
      }))
    );

    return existenceChecks
      .filter((check) => check.exists)
      .map((check) => check.key);
  }

  private async withClient<T>(
    config: ConnectionConfig,
    operation: (client: RedisClientLike) => Promise<T>
  ): Promise<T> {
    const client = createClient({ url: config.url });

    client.on("error", () => undefined);
    await client.connect();

    try {
      return await operation(client as RedisClientLike);
    } finally {
      await client.disconnect();
    }
  }
}

function buildResourceMatchPattern(
  namespace: string[],
  search: string | undefined,
  delimiter: string
): string {
  const prefix =
    namespace.length > 0 ? `${namespace.join(delimiter)}${delimiter}` : "";
  const searchToken = search?.trim();

  if (searchToken) {
    return `${prefix}*${searchToken}*`;
  }

  return `${prefix}*`;
}

function requireResourceKey(request: MutationRequest): string {
  if (!request.resourceId) {
    throw new ValidationError(`${request.action} mutations require resourceId.`);
  }

  return decodeResourceId(request.resourceId);
}

function serializeMutationValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value === undefined || value === null) {
    return "";
  }

  return JSON.stringify(value);
}

function isResourceDescriptor(
  resource: ResourceDescriptor | null
): resource is ResourceDescriptor {
  return resource !== null;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Math.trunc(value), min), max);
}
