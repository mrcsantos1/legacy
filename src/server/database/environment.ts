import type { ConnectionConfig, ConnectionSummary } from "./types";
import { redactRedisUrl } from "./session-store";

export const DEFAULT_ENV_CONNECTION_ID = "env:redis:default";

export function getEnvironmentConnection(): ConnectionConfig | undefined {
  const url = process.env.LEGACY_DEFAULT_REDIS_URL?.trim();

  if (!url) {
    return undefined;
  }

  return {
    database: inferRedisDatabase(url),
    id: DEFAULT_ENV_CONNECTION_ID,
    label: process.env.LEGACY_DEFAULT_REDIS_LABEL?.trim() || "Default Redis",
    provider: "redis",
    source: "environment",
    url
  };
}

export function getEnvironmentConnectionSummary():
  | ConnectionSummary
  | undefined {
  const connection = getEnvironmentConnection();

  if (!connection) {
    return undefined;
  }

  return {
    database: connection.database,
    id: connection.id,
    label: connection.label,
    provider: connection.provider,
    source: connection.source,
    urlPreview: redactRedisUrl(connection.url)
  };
}

function inferRedisDatabase(url: string): number | undefined {
  try {
    const parsed = new URL(url);
    const database = parsed.pathname.replace("/", "");

    if (database.length === 0) {
      return undefined;
    }

    const numericDatabase = Number(database);
    return Number.isInteger(numericDatabase) ? numericDatabase : undefined;
  } catch {
    return undefined;
  }
}
