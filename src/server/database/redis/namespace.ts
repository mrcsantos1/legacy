import type {
  NamespaceNode,
  NamespaceNodeKind,
  ResourceListScope
} from "../types";

export interface DeriveNamespaceNodesInput {
  readonly delimiter: string;
  readonly keys: string[];
  readonly path: string[];
}

export interface FilterResourceKeysByScopeInput {
  readonly delimiter: string;
  readonly keys: string[];
  readonly namespace: string[];
  readonly scope: ResourceListScope;
}

interface NamespaceNodeDraft {
  readonly depth: number;
  hasChildren: boolean;
  hasRecord: boolean;
  readonly id: string;
  readonly label: string;
  readonly path: string[];
}

export function namespacePathToMatchPattern(
  path: string[],
  delimiter: string
): string {
  if (path.length === 0) {
    return "*";
  }

  return `${path.join(delimiter)}${delimiter}*`;
}

export function keyToPath(key: string, delimiter: string): string[] {
  return key.split(delimiter).filter((segment) => segment.length > 0);
}

export function encodeResourceId(key: string): string {
  return encodeURIComponent(key);
}

export function decodeResourceId(resourceId: string): string {
  return decodeURIComponent(resourceId);
}

export function deriveNamespaceNodes({
  delimiter,
  keys,
  path
}: DeriveNamespaceNodesInput): NamespaceNode[] {
  const nodes = new Map<string, NamespaceNodeDraft>();

  for (const key of keys) {
    const parts = keyToPath(key, delimiter);

    if (!path.every((segment, index) => parts[index] === segment)) {
      continue;
    }

    const label = parts[path.length];

    if (label === undefined) {
      continue;
    }

    const nextPath = [...path, label];
    const id = nextPath.join(delimiter);
    const hasChildren = parts.length > path.length + 1;
    const hasRecord = parts.length === path.length + 1;
    const existingNode = nodes.get(id);

    if (existingNode) {
      existingNode.hasChildren = existingNode.hasChildren || hasChildren;
      existingNode.hasRecord = existingNode.hasRecord || hasRecord;
      continue;
    }

    nodes.set(id, {
      depth: path.length,
      hasChildren,
      hasRecord,
      id,
      label,
      path: nextPath
    });
  }

  return [...nodes.values()]
    .map((node) => toNamespaceNode(node, delimiter))
    .sort(compareNamespaceNodes);
}

export function filterResourceKeysByScope({
  delimiter,
  keys,
  namespace,
  scope
}: FilterResourceKeysByScopeInput): string[] {
  return keys.filter((key) => {
    const path = keyToPath(key, delimiter);

    if (!namespace.every((segment, index) => path[index] === segment)) {
      return false;
    }

    if (scope === "descendants") {
      return path.length > namespace.length;
    }

    return path.length === namespace.length + 1;
  });
}

function toNamespaceNode(
  node: NamespaceNodeDraft,
  delimiter: string
): NamespaceNode {
  const kind = namespaceNodeKind(node);
  const resourceId =
    kind === "record" || kind === "hybrid"
      ? encodeResourceId(node.path.join(delimiter))
      : undefined;

  return {
    depth: node.depth,
    hasChildren: node.hasChildren,
    id: node.id,
    kind,
    label: node.label,
    path: node.path,
    resourceId
  };
}

function namespaceNodeKind(node: NamespaceNodeDraft): NamespaceNodeKind {
  if (node.hasChildren && node.hasRecord) {
    return "hybrid";
  }

  if (node.hasRecord) {
    return "record";
  }

  return "folder";
}

function compareNamespaceNodes(
  left: NamespaceNode,
  right: NamespaceNode
): number {
  const kindDelta = namespaceNodeKindRank(left.kind) - namespaceNodeKindRank(right.kind);

  if (kindDelta !== 0) {
    return kindDelta;
  }

  return left.label.localeCompare(right.label);
}

function namespaceNodeKindRank(kind: NamespaceNodeKind): number {
  switch (kind) {
    case "folder":
      return 0;
    case "hybrid":
      return 1;
    case "record":
      return 2;
  }
}
