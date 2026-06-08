import type {
  ConnectionConfig,
  ConnectionSummary,
  NewConnectionInput
} from "./types";

interface StoredSessionConnection {
  readonly config: ConnectionConfig;
  readonly summary: ConnectionSummary;
}

export function redactRedisUrl(value: string): string {
  try {
    const url = new URL(value);

    if (url.password.length > 0) {
      const username = url.username.length > 0 ? `${url.username}:` : ":";
      return `${url.protocol}//${username}***@${url.host}${url.pathname}${url.search}`;
    }

    return value;
  } catch {
    return value.replace(/:\/\/([^:@/]+):([^@/]+)@/, "://$1:***@");
  }
}

export class SessionConnectionStore {
  private readonly sessions = new Map<string, Map<string, StoredSessionConnection>>();

  create(sessionId: string, input: NewConnectionInput): ConnectionSummary {
    const id = `session:${crypto.randomUUID()}`;
    const config: ConnectionConfig = {
      database: input.database,
      id,
      label: input.label,
      provider: input.provider,
      source: "session",
      tls: input.tls,
      url: input.url
    };
    const summary: ConnectionSummary = {
      database: input.database,
      id,
      label: input.label,
      provider: input.provider,
      source: "session",
      tls: input.tls,
      urlPreview: redactRedisUrl(input.url)
    };

    const sessionConnections = this.sessions.get(sessionId) ?? new Map();
    sessionConnections.set(id, { config, summary });
    this.sessions.set(sessionId, sessionConnections);

    return summary;
  }

  delete(sessionId: string, connectionId: string): boolean {
    return this.sessions.get(sessionId)?.delete(connectionId) ?? false;
  }

  get(sessionId: string, connectionId: string): ConnectionConfig | undefined {
    return this.sessions.get(sessionId)?.get(connectionId)?.config;
  }

  list(sessionId: string): ConnectionSummary[] {
    return [...(this.sessions.get(sessionId)?.values() ?? [])].map(
      (entry) => entry.summary
    );
  }
}
