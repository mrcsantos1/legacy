import type {
    ConnectionSummary,
    DataPreview,
    DataPreviewMeta,
    MutationRequest,
    NamespaceListResult,
    NamespaceNode,
    NewConnectionInput,
    OperationResult,
    ResourceDescriptor,
    ResourceInspection,
    ResourceListResult,
    ResourceListScope
} from "@/server/database/types";

export interface ConnectionsResponse {
  readonly connections: ConnectionSummary[];
}

export interface CreateConnectionResponse {
  readonly connection: ConnectionSummary;
}

export interface DatabaseApi {
  createSessionConnection(input: NewConnectionInput): Promise<CreateConnectionResponse>;
  deleteSessionConnection(connectionId: string): Promise<{ deleted: boolean }>;
  getConnections(): Promise<ConnectionsResponse>;
  inspectResource(input: {
    readonly connectionId: string;
    readonly resourceId: string;
  }): Promise<ResourceInspection>;
  listNamespaces(input: {
    readonly connectionId: string;
    readonly count?: number;
    readonly cursor?: string;
    readonly path?: string[];
  }): Promise<NamespaceListResult>;
  listResources(input: {
    readonly connectionId: string;
    readonly count?: number;
    readonly cursor?: string;
    readonly namespace?: string[];
    readonly scope?: ResourceListScope;
    readonly search?: string;
  }): Promise<ResourceListResult>;
  mutateResource(input: {
    readonly connectionId: string;
    readonly mutation: MutationRequest;
  }): Promise<OperationResult>;
}

export type {
    ConnectionSummary,
    DataPreview,
    DataPreviewMeta,
    MutationRequest,
    NamespaceListResult,
    NamespaceNode,
    NewConnectionInput,
    OperationResult,
    ResourceDescriptor,
    ResourceInspection,
    ResourceListResult,
    ResourceListScope
};

export async function getConnections(): Promise<ConnectionsResponse> {
  return requestJson<ConnectionsResponse>("/api/connections");
}

export async function createSessionConnection(
  input: NewConnectionInput
): Promise<CreateConnectionResponse> {
  return requestJson<CreateConnectionResponse>("/api/connections/session", {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export async function deleteSessionConnection(
  connectionId: string
): Promise<{ deleted: boolean }> {
  return requestJson<{ deleted: boolean }>(
    `/api/connections/session/${encodeURIComponent(connectionId)}`,
    { method: "DELETE" }
  );
}

export async function listNamespaces(input: {
  readonly connectionId: string;
  readonly count?: number;
  readonly cursor?: string;
  readonly path?: string[];
}): Promise<NamespaceListResult> {
  const query = new URLSearchParams();

  if (input.path && input.path.length > 0) {
    query.set("path", input.path.join(":"));
  }

  if (input.cursor) {
    query.set("cursor", input.cursor);
  }

  if (input.count !== undefined) {
    query.set("count", String(input.count));
  }

  return requestJson<NamespaceListResult>(
    `/api/connections/${encodeURIComponent(input.connectionId)}/namespaces${formatQuery(query)}`
  );
}

export async function listResources(input: {
  readonly connectionId: string;
  readonly count?: number;
  readonly cursor?: string;
  readonly namespace?: string[];
  readonly scope?: ResourceListScope;
  readonly search?: string;
}): Promise<ResourceListResult> {
  const query = new URLSearchParams();

  if (input.namespace && input.namespace.length > 0) {
    query.set("namespace", input.namespace.join(":"));
  }

  if (input.search) {
    query.set("search", input.search);
  }

  if (input.scope) {
    query.set("scope", input.scope);
  }

  if (input.cursor) {
    query.set("cursor", input.cursor);
  }

  if (input.count !== undefined) {
    query.set("count", String(input.count));
  }

  return requestJson<ResourceListResult>(
    `/api/connections/${encodeURIComponent(input.connectionId)}/resources${formatQuery(query)}`
  );
}

export async function inspectResource(input: {
  readonly connectionId: string;
  readonly resourceId: string;
}): Promise<ResourceInspection> {
  return requestJson<ResourceInspection>(
    `/api/connections/${encodeURIComponent(input.connectionId)}/resources/${encodeURIComponent(input.resourceId)}`
  );
}

export async function mutateResource(input: {
  readonly connectionId: string;
  readonly mutation: MutationRequest;
}): Promise<OperationResult> {
  return requestJson<OperationResult>(
    `/api/connections/${encodeURIComponent(input.connectionId)}/mutations`,
    {
      body: JSON.stringify(input.mutation),
      method: "POST"
    }
  );
}

export const databaseApi: DatabaseApi = {
  createSessionConnection,
  deleteSessionConnection,
  getConnections,
  inspectResource,
  listNamespaces,
  listResources,
  mutateResource
};

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...init.headers
    },
    ...init
  });

  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    throw createApiError(payload);
  }

  return payload as T;
}

function formatQuery(query: URLSearchParams): string {
  const value = query.toString();
  return value.length > 0 ? `?${value}` : "";
}

function createApiError(payload: unknown): Error {
  const errorPayload = extractErrorPayload(payload);
  const error = new Error(errorPayload.message);

  error.name = errorPayload.name;
  return error;
}

function extractErrorPayload(payload: unknown): { message: string; name: string } {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return {
      message: payload.error.message,
      name:
        "name" in payload.error && typeof payload.error.name === "string"
          ? payload.error.name
          : "LegacyApiError"
    };
  }

  return {
    message: "Legacy API request failed.",
    name: "LegacyApiError"
  };
}
