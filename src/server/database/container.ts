import { NotFoundError } from "./errors";
import { RedisAdapter } from "./redis/adapter";
import { DatabaseAdapterRegistry } from "./registry";
import { DatabaseService } from "./service";
import { SessionConnectionStore } from "./session-store";
import type {
    ConnectionConfig,
    ConnectionSummary,
    NewConnectionInput
} from "./types";

const registry = new DatabaseAdapterRegistry();
registry.register("redis", new RedisAdapter());

export const databaseService = new DatabaseService(registry);
export const sessionConnectionStore = new SessionConnectionStore();

export function listConnectionSummaries(sessionId: string): ConnectionSummary[] {
  return sessionConnectionStore.list(sessionId);
}

export function resolveConnection(
  sessionId: string,
  connectionId: string
): ConnectionConfig {
  const sessionConnection = sessionConnectionStore.get(sessionId, connectionId);

  if (!sessionConnection) {
    throw new NotFoundError(`Connection not found: ${connectionId}`);
  }

  return sessionConnection;
}

export function createSessionConnection(
  sessionId: string,
  input: NewConnectionInput
): ConnectionSummary {
  return sessionConnectionStore.create(sessionId, input);
}

export function deleteSessionConnection(
  sessionId: string,
  connectionId: string
): boolean {
  return sessionConnectionStore.delete(sessionId, connectionId);
}
