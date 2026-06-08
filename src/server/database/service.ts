import type {
  AdapterRegistry,
  ConnectionConfig,
  MutationRequest,
  NamespaceListQuery,
  ResourceListQuery
} from "./types";

export class DatabaseService {
  constructor(private readonly registry: AdapterRegistry) {}

  inspectResource(config: ConnectionConfig, resourceId: string) {
    return this.registry.getAdapter(config.provider).inspectResource(config, resourceId);
  }

  listNamespaces(config: ConnectionConfig, query: NamespaceListQuery) {
    return this.registry.getAdapter(config.provider).listNamespaces(config, query);
  }

  listResources(config: ConnectionConfig, query: ResourceListQuery) {
    return this.registry.getAdapter(config.provider).listResources(config, query);
  }

  mutate(config: ConnectionConfig, request: MutationRequest) {
    return this.registry.getAdapter(config.provider).mutate(config, request);
  }

  testConnection(config: ConnectionConfig) {
    return this.registry.getAdapter(config.provider).testConnection(config);
  }
}
