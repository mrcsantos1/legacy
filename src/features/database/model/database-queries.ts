import {
    keepPreviousData,
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient
} from "@tanstack/react-query";
import { createContext, useContext } from "react";

import {
    databaseApi,
    type DatabaseApi,
    type MutationRequest,
    type NamespaceListResult,
    type NewConnectionInput,
    type ResourceListResult
} from "@/shared/api/client";

import { resourceScopeForSearch } from "./namespace-tree";

// Bounded background reconciliation with the server. Per-second TTL countdown
// happens client-side (see model/ttl.ts); it must never trigger requests.
export const LIVENESS_INTERVAL_MS = 10_000;

export const PREVIEW_LIMIT_STEP = 100;
export const PREVIEW_BYTES_STEP = 64 * 1024;
export const PREVIEW_MAX_PAGE = 10;

export const LIST_PAGE_SIZE = 100;
export const LIST_MAX_PAGES = 10;

const DatabaseApiContext = createContext<DatabaseApi>(databaseApi);

export const DatabaseApiProvider = DatabaseApiContext.Provider;

export function useDatabaseApi(): DatabaseApi {
  return useContext(DatabaseApiContext);
}

export const queryKeys = {
  connections: () => ["connections"] as const,
  inspection: (connectionId: string, resourceId: string) =>
    ["inspection", connectionId, resourceId] as const,
  namespaces: (connectionId: string, path: string[]) =>
    ["namespaces", connectionId, path.join(":")] as const,
  resources: (connectionId: string, namespace: string[], search: string) =>
    [
      "resources",
      connectionId,
      namespace.join(":"),
      resourceScopeForSearch(search),
      search
    ] as const
};

export function useConnectionsQuery() {
  const api = useDatabaseApi();

  return useQuery({
    queryFn: () => api.getConnections(),
    queryKey: queryKeys.connections()
  });
}

export function useNamespacesQuery(connectionId: string | null, path: string[]) {
  const api = useDatabaseApi();

  return useInfiniteQuery({
    enabled: connectionId !== null,
    getNextPageParam: (lastPage: NamespaceListResult) =>
      nextCursorOf(lastPage.cursor),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.listNamespaces({
        connectionId: connectionId ?? "",
        count: LIST_PAGE_SIZE,
        cursor: pageParam,
        path
      }),
    queryKey: queryKeys.namespaces(connectionId ?? "", path),
    refetchInterval: LIVENESS_INTERVAL_MS
  });
}

export function useResourcesQuery(
  connectionId: string | null,
  namespace: string[],
  search: string
) {
  const api = useDatabaseApi();

  return useInfiniteQuery({
    enabled: connectionId !== null,
    getNextPageParam: (lastPage: ResourceListResult) =>
      nextCursorOf(lastPage.cursor),
    initialPageParam: undefined as string | undefined,
    placeholderData: keepPreviousData,
    queryFn: ({ pageParam }) =>
      api.listResources({
        connectionId: connectionId ?? "",
        count: LIST_PAGE_SIZE,
        cursor: pageParam,
        namespace,
        scope: resourceScopeForSearch(search),
        search
      }),
    queryKey: queryKeys.resources(connectionId ?? "", namespace, search),
    refetchInterval: LIVENESS_INTERVAL_MS
  });
}

function nextCursorOf(cursor: string): string | undefined {
  return cursor !== "" && cursor !== "0" ? cursor : undefined;
}

export function useInspectionQuery(
  connectionId: string | null,
  resourceId: string | null,
  previewPage = 1
) {
  const api = useDatabaseApi();
  const page = Math.min(Math.max(previewPage, 1), PREVIEW_MAX_PAGE);

  return useQuery({
    enabled: connectionId !== null && resourceId !== null,
    gcTime: 0,
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[2] === resourceId ? previousData : undefined,
    queryFn: () =>
      api.inspectResource({
        bytes: page * PREVIEW_BYTES_STEP,
        connectionId: connectionId ?? "",
        limit: page * PREVIEW_LIMIT_STEP,
        resourceId: resourceId ?? ""
      }),
    queryKey: [...queryKeys.inspection(connectionId ?? "", resourceId ?? ""), page],
    refetchInterval: LIVENESS_INTERVAL_MS,
    retry: false
  });
}

export function useCreateConnectionMutation() {
  const api = useDatabaseApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NewConnectionInput) =>
      api.createSessionConnection(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connections()
      });
    }
  });
}

export function useDeleteConnectionMutation() {
  const api = useDatabaseApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) =>
      api.deleteSessionConnection(connectionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connections()
      });
    }
  });
}

export function useMutateResourceMutation(connectionId: string | null) {
  const api = useDatabaseApi();

  return useMutation({
    mutationFn: (mutation: MutationRequest) =>
      api.mutateResource({ connectionId: connectionId ?? "", mutation })
  });
}
