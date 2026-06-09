import {
  combine,
  createEffect,
  createEvent,
  createStore,
  sample
} from "effector";

import { databaseApi, type DatabaseApi } from "@/shared/api/client";
import type {
  ConnectionSummary,
  MutationRequest,
  NamespaceNode,
  NewConnectionInput,
  ResourceDescriptor,
  ResourceInspection,
  ResourceListScope
} from "@/server/database/types";

export function createDatabaseModel(api: DatabaseApi) {
  const appStarted = createEvent();
  const connectionSelected = createEvent<string>();
  const namespaceSelected = createEvent<string[]>();
  const resourceSelected = createEvent<string>();
  const resourcesRefreshed = createEvent();
  const searchChanged = createEvent<string>();
  const visibleDataRefreshed = createEvent();

  const loadConnectionsFx = createEffect(api.getConnections);
  const createSessionConnectionFx = createEffect((input: NewConnectionInput) =>
    api.createSessionConnection(input)
  );
  const deleteSessionConnectionFx = createEffect((connectionId: string) =>
    api.deleteSessionConnection(connectionId)
  );
  const loadNamespacesFx = createEffect(
    (input: { connectionId: string; path?: string[] }) =>
      api.listNamespaces({
        connectionId: input.connectionId,
        count: 100,
        path: input.path
      })
  );
  const loadResourcesFx = createEffect(
    (input: {
      connectionId: string;
      namespace?: string[];
      scope?: ResourceListScope;
      search?: string;
    }) =>
      api.listResources({
        connectionId: input.connectionId,
        count: 100,
        namespace: input.namespace,
        scope: input.scope,
        search: input.search
      })
  );
  const inspectResourceFx = createEffect(
    (input: { connectionId: string; resourceId: string }) =>
      api.inspectResource(input)
  );
  const mutateResourceFx = createEffect(
    (input: { connectionId: string; mutation: MutationRequest }) =>
      api.mutateResource(input)
  );

  const $connections = createStore<ConnectionSummary[]>([])
    .on(loadConnectionsFx.doneData, (_, payload) => payload.connections)
    .on(createSessionConnectionFx.doneData, (connections, payload) => [
      ...connections,
      payload.connection
    ])
    .on(deleteSessionConnectionFx.done, (connections, { params }) =>
      connections.filter((connection) => connection.id !== params)
    );

  const $selectedConnectionId = createStore<string | null>(null)
    .on(connectionSelected, (_, connectionId) => connectionId)
    .on(createSessionConnectionFx.doneData, (_, payload) => payload.connection.id)
    .reset(deleteSessionConnectionFx.done);

  const $selectedNamespacePath = createStore<string[]>([])
    .on(namespaceSelected, (_, path) => path)
    .reset(connectionSelected);
  const $search = createStore("")
    .on(searchChanged, (_, value) => value)
    .reset(connectionSelected);
  const $namespaceNodes = createStore<NamespaceNode[]>([])
    .on(loadNamespacesFx.done, (nodes, { params, result }) =>
      mergeNamespaceNodes(nodes, params.path ?? [], result.nodes)
    )
    .on(inspectResourceFx.fail, (nodes, { error, params }) =>
      isNotFoundError(error)
        ? removeNamespaceNodesForResourceIds(nodes, [params.resourceId])
        : nodes
    )
    .on(mutateResourceFx.done, (nodes, { params, result }) =>
      shouldPurgeChangedResources(params.mutation)
        ? removeNamespaceNodesForResourceIds(nodes, result.changedResourceIds)
        : nodes
    )
    .reset(connectionSelected);
  const $resources = createStore<ResourceDescriptor[]>([])
    .on(loadResourcesFx.doneData, (_, payload) => payload.resources)
    .on(inspectResourceFx.fail, (resources, { error, params }) =>
      isNotFoundError(error)
        ? removeResourcesForIds(resources, [params.resourceId])
        : resources
    )
    .on(mutateResourceFx.done, (resources, { params, result }) =>
      shouldPurgeChangedResources(params.mutation)
        ? removeResourcesForIds(resources, result.changedResourceIds)
        : resources
    );
  const $resourceCursor = createStore("0").on(
    loadResourcesFx.doneData,
    (_, payload) => payload.cursor
  );
  const $selectedResourceId = createStore<string | null>(null)
    .on(resourceSelected, (_, resourceId) => resourceId)
    .on(mutateResourceFx.done, (resourceId, { params, result }) =>
      resourceId &&
      shouldClearSelectedResource(
        resourceId,
        params.mutation,
        result.changedResourceIds
      )
        ? null
        : resourceId
    )
    .on(inspectResourceFx.fail, (resourceId, { error, params }) =>
      resourceId === params.resourceId && isNotFoundError(error)
        ? null
        : resourceId
    )
    .reset(connectionSelected, namespaceSelected);
  const $inspection = createStore<ResourceInspection | null>(null)
    .on(inspectResourceFx.doneData, (_, inspection) => inspection)
    .on(mutateResourceFx.done, (inspection, { params, result }) =>
      inspection &&
      shouldClearSelectedResource(
        inspection.resource.id,
        params.mutation,
        result.changedResourceIds
      )
        ? null
        : inspection
    )
    .on(inspectResourceFx.fail, (inspection, { error, params }) =>
      inspection?.resource.id === params.resourceId && isNotFoundError(error)
        ? null
        : inspection
    )
    .reset(connectionSelected, namespaceSelected);
  const $error = createStore<string | null>(null)
    .on(loadConnectionsFx.failData, (_, error) => error.message)
    .on(createSessionConnectionFx.failData, (_, error) => error.message)
    .on(loadNamespacesFx.failData, (_, error) => error.message)
    .on(loadResourcesFx.failData, (_, error) => error.message)
    .on(inspectResourceFx.failData, (_, error) => error.message)
    .on(mutateResourceFx.failData, (_, error) => error.message)
    .reset(
      loadConnectionsFx,
      createSessionConnectionFx,
      loadNamespacesFx,
      loadResourcesFx,
      inspectResourceFx,
      mutateResourceFx
    );

  const $isLoadingConnections = loadConnectionsFx.pending;
  const $isLoadingNamespaces = loadNamespacesFx.pending;
  const $isLoadingResources = loadResourcesFx.pending;
  const $isInspecting = inspectResourceFx.pending;
  const $isMutating = mutateResourceFx.pending;
  const $isConnecting = createSessionConnectionFx.pending;

  const $selectedConnection = combine(
    $connections,
    $selectedConnectionId,
    (connections, selectedId) =>
      connections.find((connection) => connection.id === selectedId) ?? null
  );

  sample({
    clock: appStarted,
    target: loadConnectionsFx
  });

  sample({
    clock: loadConnectionsFx.doneData,
    filter: (payload) => payload.connections.length > 0,
    fn: (payload) => payload.connections[0]!.id,
    target: connectionSelected
  });

  sample({
    clock: createSessionConnectionFx.doneData,
    fn: (payload) => payload.connection.id,
    target: connectionSelected
  });

  sample({
    clock: connectionSelected,
    fn: (connectionId) => ({ connectionId, path: [] }),
    target: loadNamespacesFx
  });

  sample({
    clock: connectionSelected,
    fn: (connectionId) => ({
      connectionId,
      namespace: [],
      scope: "children" as const,
      search: ""
    }),
    target: loadResourcesFx
  });

  sample({
    clock: namespaceSelected,
    source: $selectedConnectionId,
    filter: (connectionId): connectionId is string => connectionId !== null,
    fn: (connectionId, path) => ({ connectionId: connectionId ?? "", path }),
    target: loadNamespacesFx
  });

  sample({
    clock: namespaceSelected,
    source: {
      connectionId: $selectedConnectionId,
      search: $search
    },
    filter: ({ connectionId }) => connectionId !== null,
    fn: ({ connectionId, search }, namespace) => ({
      connectionId: connectionId!,
      namespace,
      scope: resourceScopeForSearch(search),
      search
    }),
    target: loadResourcesFx
  });

  const refreshResourcesSource = {
    connectionId: $selectedConnectionId,
    namespace: $selectedNamespacePath,
    search: $search
  };

  sample({
    clock: resourcesRefreshed,
    source: refreshResourcesSource,
    filter: ({ connectionId }) => connectionId !== null,
    fn: toLoadResourcesInput,
    target: loadResourcesFx
  });

  sample({
    clock: resourceSelected,
    source: $selectedConnectionId,
    filter: (connectionId): connectionId is string => connectionId !== null,
    fn: (connectionId, resourceId) => ({
      connectionId: connectionId ?? "",
      resourceId
    }),
    target: inspectResourceFx
  });

  sample({
    clock: mutateResourceFx.done,
    target: visibleDataRefreshed
  });

  sample({
    clock: visibleDataRefreshed,
    source: {
      connectionId: $selectedConnectionId,
      isLoadingNamespaces: $isLoadingNamespaces,
      namespace: $selectedNamespacePath
    },
    filter: ({ connectionId, isLoadingNamespaces }) =>
      connectionId !== null && !isLoadingNamespaces,
    fn: ({ connectionId, namespace }) => ({
      connectionId: connectionId!,
      path: namespace
    }),
    target: loadNamespacesFx
  });

  sample({
    clock: visibleDataRefreshed,
    source: {
      ...refreshResourcesSource,
      isLoadingResources: $isLoadingResources
    },
    filter: ({ connectionId, isLoadingResources }) =>
      connectionId !== null && !isLoadingResources,
    fn: toLoadResourcesInput,
    target: loadResourcesFx
  });

  sample({
    clock: visibleDataRefreshed,
    source: {
      connectionId: $selectedConnectionId,
      isInspecting: $isInspecting,
      resourceId: $selectedResourceId
    },
    filter: ({ connectionId, isInspecting, resourceId }) =>
      connectionId !== null && resourceId !== null && !isInspecting,
    fn: ({ connectionId, resourceId }) => ({
      connectionId: connectionId!,
      resourceId: resourceId!
    }),
    target: inspectResourceFx
  });

  sample({
    clock: inspectResourceFx.fail,
    source: {
      connectionId: $selectedConnectionId,
      namespace: $selectedNamespacePath
    },
    filter: ({ connectionId }, { error }) =>
      connectionId !== null && isNotFoundError(error),
    fn: ({ connectionId, namespace }) => ({
      connectionId: connectionId!,
      path: namespace
    }),
    target: loadNamespacesFx
  });

  sample({
    clock: inspectResourceFx.fail,
    filter: ({ error }) => isNotFoundError(error),
    fn: () => undefined,
    target: resourcesRefreshed
  });

  return {
    effects: {
      createSessionConnectionFx,
      deleteSessionConnectionFx,
      inspectResourceFx,
      loadConnectionsFx,
      loadNamespacesFx,
      loadResourcesFx,
      mutateResourceFx
    },
    events: {
      appStarted,
      connectionSelected,
      namespaceSelected,
      resourceSelected,
      resourcesRefreshed,
      searchChanged,
      visibleDataRefreshed
    },
    stores: {
      $connections,
      $error,
      $inspection,
      $isConnecting,
      $isInspecting,
      $isLoadingConnections,
      $isLoadingNamespaces,
      $isLoadingResources,
      $isMutating,
      $namespaceNodes,
      $resourceCursor,
      $resources,
      $search,
      $selectedConnection,
      $selectedConnectionId,
      $selectedNamespacePath,
      $selectedResourceId
    }
  };
}

export const databaseModel = createDatabaseModel(databaseApi);

function mergeNamespaceNodes(
  currentNodes: NamespaceNode[],
  parentPath: string[],
  incomingNodes: NamespaceNode[]
): NamespaceNode[] {
  const parentKey = pathKey(parentPath);
  const retainedNodes = currentNodes.filter(
    (node) => pathKey(node.path.slice(0, -1)) !== parentKey
  );
  const nodesById = new Map<string, NamespaceNode>();

  for (const node of [...retainedNodes, ...incomingNodes]) {
    nodesById.set(node.id, node);
  }

  return [...nodesById.values()].sort((left, right) =>
    left.path.join(":").localeCompare(right.path.join(":"))
  );
}

function pathKey(path: string[]): string {
  return path.join("\u0000");
}

function resourceScopeForSearch(search: string): ResourceListScope {
  return search.trim().length > 0 ? "descendants" : "children";
}

function toLoadResourcesInput(input: {
  readonly connectionId: string | null;
  readonly namespace: string[];
  readonly search: string;
}): {
  readonly connectionId: string;
  readonly namespace: string[];
  readonly scope: ResourceListScope;
  readonly search: string;
} {
  return {
    connectionId: input.connectionId!,
    namespace: input.namespace,
    scope: resourceScopeForSearch(input.search),
    search: input.search
  };
}

function isNotFoundError(error: Error): boolean {
  return error.name === "NotFoundError";
}

function shouldPurgeChangedResources(mutation: MutationRequest): boolean {
  return mutation.action === "delete" || mutation.action === "rename";
}

function shouldClearSelectedResource(
  resourceId: string,
  mutation: MutationRequest,
  changedResourceIds: string[]
): boolean {
  if (!shouldPurgeChangedResources(mutation)) {
    return false;
  }

  return (
    mutation.resourceId === resourceId || changedResourceIds.includes(resourceId)
  );
}

function removeNamespaceNodesForResourceIds(
  nodes: NamespaceNode[],
  resourceIds: string[]
): NamespaceNode[] {
  const staleResourceIds = new Set(resourceIds);

  return nodes.filter(
    (node) => !node.resourceId || !staleResourceIds.has(node.resourceId)
  );
}

function removeResourcesForIds(
  resources: ResourceDescriptor[],
  resourceIds: string[]
): ResourceDescriptor[] {
  const staleResourceIds = new Set(resourceIds);

  return resources.filter((resource) => !staleResourceIds.has(resource.id));
}
