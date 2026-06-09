import type {
    MutationRequest,
    NamespaceNode,
    ResourceDescriptor,
    ResourceListScope
} from "@/shared/api/client";

export function mergeNamespaceNodes(
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

export function resourceScopeForSearch(search: string): ResourceListScope {
  return search.trim().length > 0 ? "descendants" : "children";
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.name === "NotFoundError";
}

export function shouldPurgeChangedResources(mutation: MutationRequest): boolean {
  return mutation.action === "delete" || mutation.action === "rename";
}

export function shouldClearSelectedResource(
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

export function removeNamespaceNodesForResourceIds(
  nodes: NamespaceNode[],
  resourceIds: string[]
): NamespaceNode[] {
  const staleResourceIds = new Set(resourceIds);

  return nodes.filter(
    (node) => !node.resourceId || !staleResourceIds.has(node.resourceId)
  );
}

export function removeResourcesForIds(
  resources: ResourceDescriptor[],
  resourceIds: string[]
): ResourceDescriptor[] {
  const staleResourceIds = new Set(resourceIds);

  return resources.filter((resource) => !staleResourceIds.has(resource.id));
}

function pathKey(path: string[]): string {
  return path.join("\u0000");
}
