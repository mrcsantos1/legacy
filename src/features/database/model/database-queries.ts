import {
    useMutation,
    useQuery,
    useQueryClient
} from "@tanstack/react-query";
import { createContext, useContext } from "react";

import {
    databaseApi,
    type DatabaseApi,
    type MutationRequest,
    type NewConnectionInput
} from "@/shared/api/client";

import { resourceScopeForSearch } from "./namespace-tree";

export const LIVENESS_INTERVAL_MS = 1000;

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

  return useQuery({
    enabled: connectionId !== null,
    queryFn: () =>
      api.listNamespaces({ connectionId: connectionId ?? "", count: 100, path }),
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

  return useQuery({
    enabled: connectionId !== null,
    queryFn: () =>
      api.listResources({
        connectionId: connectionId ?? "",
        count: 100,
        namespace,
        scope: resourceScopeForSearch(search),
        search
      }),
    queryKey: queryKeys.resources(connectionId ?? "", namespace, search),
    refetchInterval: LIVENESS_INTERVAL_MS
  });
}

export function useInspectionQuery(
  connectionId: string | null,
  resourceId: string | null
) {
  const api = useDatabaseApi();

  return useQuery({
    enabled: connectionId !== null && resourceId !== null,
    queryFn: () =>
      api.inspectResource({
        connectionId: connectionId ?? "",
        resourceId: resourceId ?? ""
      }),
    queryKey: queryKeys.inspection(connectionId ?? "", resourceId ?? ""),
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
