import type { DatabaseProvider } from "@/server/database/types";

export const REMEMBERED_CONNECTIONS_KEY = "legacy:remembered-connections:v1";
export const REMEMBERED_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface RememberedConnection {
  readonly createdAt: number;
  readonly database?: number;
  readonly expiresAt: number;
  readonly id: string;
  readonly label: string;
  readonly provider: DatabaseProvider;
  readonly tls?: boolean;
  readonly url: string;
}

export interface RememberConnectionInput {
  readonly database?: number;
  readonly label: string;
  readonly provider: DatabaseProvider;
  readonly tls?: boolean;
  readonly url: string;
}

export function loadRememberedConnections(
  now: number = Date.now()
): RememberedConnection[] {
  const storage = getStorage();

  if (!storage) {
    return [];
  }

  const entries = readAll(storage);
  const active = entries.filter((entry) => entry.expiresAt > now);

  if (active.length !== entries.length) {
    writeAll(storage, active);
  }

  return [...active].sort((left, right) => right.createdAt - left.createdAt);
}

export function rememberConnection(
  input: RememberConnectionInput,
  now: number = Date.now()
): RememberedConnection | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const entries = readAll(storage).filter((entry) => entry.expiresAt > now);
  const existing = entries.find((entry) => entry.url === input.url);
  const entry: RememberedConnection = {
    createdAt: existing?.createdAt ?? now,
    database: input.database,
    expiresAt: now + REMEMBERED_TTL_MS,
    id: existing?.id ?? crypto.randomUUID(),
    label: input.label,
    provider: input.provider,
    tls: input.tls,
    url: input.url
  };

  writeAll(storage, [
    entry,
    ...entries.filter((item) => item.id !== entry.id)
  ]);
  notifyRememberedChange();

  return entry;
}

export function forgetRememberedConnection(
  id: string,
  now: number = Date.now()
): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const entries = readAll(storage).filter(
    (entry) => entry.id !== id && entry.expiresAt > now
  );

  writeAll(storage, entries);
  notifyRememberedChange();
}

const EMPTY_SNAPSHOT: readonly RememberedConnection[] = [];
const listeners = new Set<() => void>();
let snapshotCache: RememberedConnection[] | null = null;

export function subscribeRememberedConnections(
  listener: () => void
): () => void {
  listeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === REMEMBERED_CONNECTIONS_KEY) {
      notifyRememberedChange();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    listeners.delete(listener);

    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

export function getRememberedConnectionsSnapshot(): readonly RememberedConnection[] {
  if (snapshotCache === null) {
    snapshotCache = loadRememberedConnections();
  }

  return snapshotCache;
}

export function getRememberedConnectionsServerSnapshot(): readonly RememberedConnection[] {
  return EMPTY_SNAPSHOT;
}

function notifyRememberedChange(): void {
  snapshotCache = null;

  for (const listener of listeners) {
    listener();
  }
}

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage;
  } catch {
    return null;
  }
}

function readAll(storage: Storage): RememberedConnection[] {
  const raw = storage.getItem(REMEMBERED_CONNECTIONS_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isRememberedConnection) : [];
  } catch {
    return [];
  }
}

function writeAll(storage: Storage, entries: RememberedConnection[]): void {
  storage.setItem(REMEMBERED_CONNECTIONS_KEY, JSON.stringify(entries));
}

function isRememberedConnection(value: unknown): value is RememberedConnection {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const entry = value as Record<string, unknown>;

  return (
    typeof entry.id === "string" &&
    typeof entry.label === "string" &&
    entry.provider === "redis" &&
    typeof entry.url === "string" &&
    typeof entry.createdAt === "number" &&
    typeof entry.expiresAt === "number" &&
    (entry.database === undefined || typeof entry.database === "number") &&
    (entry.tls === undefined || typeof entry.tls === "boolean")
  );
}
