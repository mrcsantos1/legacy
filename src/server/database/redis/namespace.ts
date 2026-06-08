import type { NamespaceNode } from "../types";

export interface DeriveNamespaceNodesInput {
  readonly delimiter: string;
  readonly keys: string[];
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
  const nodes = new Map<string, NamespaceNode>();

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

    nodes.set(id, {
      depth: path.length,
      hasChildren: parts.length > path.length + 1,
      id,
      label,
      path: nextPath
    });
  }

  return [...nodes.values()].sort((left, right) =>
    left.label.localeCompare(right.label)
  );
}
