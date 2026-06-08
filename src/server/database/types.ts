export type DatabaseProvider = "redis";

export type ConnectionSource = "environment" | "session";

export interface ConnectionConfig {
  readonly database?: number;
  readonly id: string;
  readonly label: string;
  readonly provider: DatabaseProvider;
  readonly source: ConnectionSource;
  readonly tls?: boolean;
  readonly url: string;
}

export interface NewConnectionInput {
  readonly database?: number;
  readonly label: string;
  readonly provider: DatabaseProvider;
  readonly tls?: boolean;
  readonly url: string;
}

export interface ConnectionSummary {
  readonly database?: number;
  readonly id: string;
  readonly label: string;
  readonly provider: DatabaseProvider;
  readonly source: ConnectionSource;
  readonly tls?: boolean;
  readonly urlPreview: string;
}

export interface AdapterCapabilities {
  readonly canDelete: boolean;
  readonly canExpire: boolean;
  readonly canListNamespaces: boolean;
  readonly canListResources: boolean;
  readonly canReadResource: boolean;
  readonly canRename: boolean;
  readonly canUpdate: boolean;
  readonly supportsRawCommand: boolean;
  readonly supportsSchemas: boolean;
  readonly supportsTTL: boolean;
  readonly supportsTabularRows: boolean;
}

export type NamespaceNodeKind = "folder" | "hybrid" | "record";

export interface NamespaceNode {
  readonly cursor?: string;
  readonly depth: number;
  readonly hasChildren: boolean;
  readonly id: string;
  readonly kind: NamespaceNodeKind;
  readonly label: string;
  readonly path: string[];
  readonly resourceId?: string;
}

export interface NamespaceListQuery {
  readonly count?: number;
  readonly cursor?: string;
  readonly delimiter?: string;
  readonly path?: string[];
}

export interface NamespaceListResult {
  readonly cursor: string;
  readonly nodes: NamespaceNode[];
}

export type ResourceKind = "key" | "table" | "view" | "collection";

export interface ResourceDescriptor {
  readonly id: string;
  readonly kind: ResourceKind;
  readonly memoryBytes?: number;
  readonly name: string;
  readonly path: string[];
  readonly provider: DatabaseProvider;
  readonly ttlSeconds?: number;
  readonly type: string;
}

export type ResourceListScope = "children" | "descendants";

export interface ResourceListQuery {
  readonly count?: number;
  readonly cursor?: string;
  readonly delimiter?: string;
  readonly namespace?: string[];
  readonly search?: string;
  readonly scope?: ResourceListScope;
  readonly type?: string;
}

export interface ResourceListResult {
  readonly cursor: string;
  readonly resources: ResourceDescriptor[];
}

export type DataPreview =
  | {
      readonly encoding: "utf8";
      readonly kind: "scalar";
      readonly value: string | null;
    }
  | {
      readonly kind: "object";
      readonly value: Record<string, string>;
    }
  | {
      readonly kind: "list";
      readonly length?: number;
      readonly value: string[];
    }
  | {
      readonly kind: "zset";
      readonly value: Array<{ readonly score: number; readonly value: string }>;
    }
  | {
      readonly kind: "unsupported";
      readonly message: string;
    };

export interface ResourceInspection {
  readonly metadata: Record<string, unknown>;
  readonly resource: ResourceDescriptor;
  readonly value: DataPreview;
}

export type MutationAction = "create" | "delete" | "expire" | "rename" | "update";

export interface MutationRequest {
  readonly action: MutationAction;
  readonly name?: string;
  readonly newName?: string;
  readonly resourceId?: string;
  readonly ttlSeconds?: number;
  readonly value?: unknown;
}

export interface OperationResult {
  readonly changedResourceIds: string[];
  readonly status: "success";
  readonly warnings?: string[];
}

export interface ConnectionTestResult {
  readonly error?: string;
  readonly ok: boolean;
  readonly serverVersion?: string;
}

export interface DatabaseAdapter {
  readonly capabilities: AdapterCapabilities;
  inspectResource(
    config: ConnectionConfig,
    resourceId: string
  ): Promise<ResourceInspection>;
  listNamespaces(
    config: ConnectionConfig,
    query: NamespaceListQuery
  ): Promise<NamespaceListResult>;
  listResources(
    config: ConnectionConfig,
    query: ResourceListQuery
  ): Promise<ResourceListResult>;
  mutate(
    config: ConnectionConfig,
    request: MutationRequest
  ): Promise<OperationResult>;
  testConnection(config: ConnectionConfig): Promise<ConnectionTestResult>;
}

export interface AdapterRegistry {
  getAdapter(provider: DatabaseProvider): DatabaseAdapter;
}
