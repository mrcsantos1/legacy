"use client";

import {
    DatabaseApiProvider,
    LIST_MAX_PAGES,
    PREVIEW_MAX_PAGE,
    useConnectionsQuery,
    useCreateConnectionMutation,
    useDeleteConnectionMutation,
    useInspectionQuery,
    useMutateResourceMutation,
    useNamespacesQuery,
    useResourcesQuery
} from "@/features/database/model/database-queries";
import {
    isNotFoundError,
    shouldPurgeChangedResources
} from "@/features/database/model/namespace-tree";
import {
    forgetRememberedConnection,
    getRememberedConnectionsServerSnapshot,
    getRememberedConnectionsSnapshot,
    rememberConnection,
    subscribeRememberedConnections,
    type RememberedConnection
} from "@/features/database/model/remembered-connections";
import {
    activeTabOf,
    useWorkspace,
    WorkspaceProvider
} from "@/features/database/model/workspace";
import {
    databaseApi,
    type DatabaseApi,
    type MutationRequest,
    type NamespaceNode
} from "@/shared/api/client";
import { Button } from "@/shared/ui/button";
import { TextInput } from "@/shared/ui/field";
import { LegacyLogo } from "@/shared/ui/legacy-logo";
import {
    QueryClient,
    QueryClientProvider,
    useQueryClient
} from "@tanstack/react-query";
import { clsx } from "clsx";
import {
    ArrowLeft,
    FileText,
    PanelLeftClose,
    PanelRightClose,
    Pencil,
    RefreshCw,
    Search
} from "lucide-react";
import {
    FormEvent,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
    type KeyboardEvent
} from "react";

import { ConnectionDrawer } from "./connection-drawer";
import { InspectorPanel } from "./inspector";
import { NamespaceTree } from "./namespace-tree";
import { ResourceGrid } from "./resource-grid";
import { ConnectionTabStrip } from "./tab-strip";
import {
    describeValueDisplay,
    formatPreviewForEditing,
    getResourceEmptyMessage,
    previewMetaOf
} from "./value-format";
import { ValueViewer } from "./value-viewer";
import { CollapsedRail, ErrorBanner } from "./workbench-states";

interface DatabaseWorkbenchProps {
  readonly api?: DatabaseApi;
}

export function DatabaseWorkbench({ api = databaseApi }: DatabaseWorkbenchProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: false }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <DatabaseApiProvider value={api}>
        <WorkspaceProvider>
          <WorkbenchView />
        </WorkspaceProvider>
      </DatabaseApiProvider>
    </QueryClientProvider>
  );
}

function WorkbenchView() {
  const { dispatch, state } = useWorkspace();
  const queryClient = useQueryClient();

  const activeTab = activeTabOf(state);
  const activeConnectionId = activeTab?.id ?? null;
  const namespacePath = activeTab?.namespacePath ?? EMPTY_PATH;
  const previewPage = activeTab?.previewPage ?? 1;
  const search = activeTab?.search ?? "";
  const searchDraft = activeTab?.searchDraft ?? "";
  const selectedResourceId = activeTab?.selectedResourceId ?? null;

  const connectionsQuery = useConnectionsQuery();
  const namespacesQuery = useNamespacesQuery(activeConnectionId, namespacePath);
  const resourcesQuery = useResourcesQuery(
    activeConnectionId,
    namespacePath,
    search
  );
  const inspectionQuery = useInspectionQuery(
    activeConnectionId,
    selectedResourceId,
    previewPage
  );
  const createConnection = useCreateConnectionMutation();
  const deleteConnection = useDeleteConnectionMutation();
  const mutateResource = useMutateResourceMutation(activeConnectionId);

  const [label, setLabel] = useState("Local Redis");
  const [url, setUrl] = useState("redis://localhost:6379");
  const [ttlDraft, setTtlDraft] = useState("300");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const remembered = useSyncExternalStore(
    subscribeRememberedConnections,
    getRememberedConnectionsSnapshot,
    getRememberedConnectionsServerSnapshot
  );

  const connectionsData = connectionsQuery.data;
  useEffect(() => {
    if (connectionsData) {
      dispatch({
        connections: connectionsData.connections,
        type: "syncConnections"
      });
    }
  }, [connectionsData, dispatch]);

  const namespacesData = namespacesQuery.data;
  useEffect(() => {
    if (namespacesData) {
      // mergeNamespaceNodes replaces all children of the merged path, so the
      // dispatch must always carry the flattened nodes of every loaded page.
      dispatch({
        nodes: namespacesData.pages.flatMap((page) => page.nodes),
        path: namespacePath,
        type: "mergeNamespaces"
      });
    }
  }, [namespacesData, namespacePath, dispatch]);

  const inspectionError = inspectionQuery.error;
  useEffect(() => {
    if (!inspectionError || !isNotFoundError(inspectionError)) {
      return;
    }

    if (selectedResourceId === null) {
      return;
    }

    dispatch({ resourceIds: [selectedResourceId], type: "purgeResources" });

    if (activeConnectionId !== null) {
      void queryClient.invalidateQueries({
        queryKey: ["resources", activeConnectionId]
      });
      void queryClient.invalidateQueries({
        queryKey: ["namespaces", activeConnectionId]
      });
    }
  }, [
    inspectionError,
    selectedResourceId,
    activeConnectionId,
    dispatch,
    queryClient
  ]);

  const inspection = inspectionQuery.data ?? null;
  const resourcesData = resourcesQuery.data;
  const visibleResources = useMemo(
    () => resourcesData?.pages.flatMap((page) => page.resources) ?? [],
    [resourcesData]
  );
  const selectedFolderLabel =
    namespacePath.length > 0 ? namespacePath.join(" / ") : "Root level records";
  const selectedFolderKey = namespacePath.join(":");
  const emptyResourceMessage = getResourceEmptyMessage({
    hasConnection: activeConnectionId !== null,
    hasSearch: search.trim().length > 0
  });
  const scanStatus = resourcesQuery.hasNextPage ? "Scan partial" : "Scan complete";
  const hasSelectedRecord = inspection !== null;
  const recordEditorValue = formatPreviewForEditing(inspection?.value);
  const valueDisplayLabel = describeValueDisplay(inspection?.value);
  const previewMeta = previewMetaOf(inspection?.value ?? undefined);
  const canLoadMorePreview =
    previewMeta?.truncated === true && previewPage < PREVIEW_MAX_PAGE;
  const isLoadingMorePreview = inspectionQuery.isPlaceholderData;
  // The editor textarea is uncontrolled and remounts via key. The key tracks
  // the page whose data is actually rendered, so it only changes (and reloads
  // defaultValue) once fresh load-more data arrives, never while typing.
  const renderedPreviewPage = isLoadingMorePreview
    ? Math.max(1, previewPage - 1)
    : previewPage;
  const editorKey = `${selectedResourceId ?? "none"}:p${renderedPreviewPage}`;
  const resourcePages = resourcesQuery.data?.pages.length ?? 0;
  const hasMoreResources =
    resourcesQuery.hasNextPage === true && resourcePages < LIST_MAX_PAGES;
  const namespacePages = namespacesQuery.data?.pages.length ?? 0;
  const hasMoreNamespaces =
    namespacesQuery.hasNextPage === true && namespacePages < LIST_MAX_PAGES;
  const isRefreshingResources =
    resourcesQuery.isFetching &&
    !resourcesQuery.isFetchingNextPage &&
    visibleResources.length > 0;
  // dataUpdatedAt is 0 while placeholder data is shown; falling back to "now"
  // keeps the client-side TTL countdown sane during that brief window.
  const inspectionObservedAtMs = inspectionQuery.dataUpdatedAt || Date.now();
  const resourcesObservedAtMs = resourcesQuery.dataUpdatedAt || Date.now();

  const inspectionTtlSeconds = inspection?.resource.ttlSeconds;
  const inspectionRefetch = inspectionQuery.refetch;
  useEffect(() => {
    if (
      inspectionTtlSeconds === undefined ||
      inspectionTtlSeconds < 0 ||
      inspectionObservedAtMs <= 0
    ) {
      return;
    }

    // Reconcile once right after the locally projected expiry so the server
    // can confirm the key is gone (NotFoundError feeds the stale-key purge).
    const delayMs = Math.max(
      0,
      inspectionObservedAtMs + inspectionTtlSeconds * 1000 - Date.now() + 250
    );
    const id = window.setTimeout(() => {
      void inspectionRefetch();
    }, delayMs);

    return () => window.clearTimeout(id);
  }, [inspectionTtlSeconds, inspectionObservedAtMs, inspectionRefetch]);

  function refreshVisibleData() {
    if (activeConnectionId === null) {
      return;
    }

    void queryClient.invalidateQueries({
      queryKey: ["resources", activeConnectionId]
    });
    void queryClient.invalidateQueries({
      queryKey: ["namespaces", activeConnectionId]
    });
    void queryClient.invalidateQueries({
      queryKey: ["inspection", activeConnectionId]
    });
  }

  function setSearchDraft(value: string) {
    dispatch({ type: "setSearchDraft", value });
  }

  const units = {
    error: resolveErrorMessage([
      connectionsQuery.error,
      namespacesQuery.error,
      resourcesQuery.error,
      createConnection.error,
      deleteConnection.error,
      mutateResource.error,
      inspectionError && !isNotFoundError(inspectionError)
        ? inspectionError
        : null
    ]),
    inspection,
    isConnecting: createConnection.isPending,
    isInspecting: inspectionQuery.isFetching,
    isLoadingNamespaces: namespacesQuery.isFetching,
    isLoadingResources: resourcesQuery.isLoading,
    isMutating: mutateResource.isPending,
    namespaceNodes: activeTab?.namespaceNodes ?? EMPTY_NODES,
    namespaceSelected: (path: string[]) =>
      dispatch({ path, type: "selectNamespace" }),
    resourceSelected: (resourceId: string) =>
      dispatch({ resourceId, type: "selectResource" }),
    selectedConnectionId: activeConnectionId,
    selectedNamespacePath: namespacePath,
    selectedResourceId,
    visibleDataRefreshed: refreshVisibleData
  };

  function handleCreateConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void connect({ label, url });
  }

  async function connect(input: {
    readonly database?: number;
    readonly label: string;
    readonly tls?: boolean;
    readonly url: string;
  }) {
    try {
      const result = await createConnection.mutateAsync({
        database: input.database,
        label: input.label,
        provider: "redis",
        tls: input.tls,
        url: input.url
      });
      dispatch({
        id: result.connection.id,
        label: result.connection.label,
        type: "openTab"
      });
      rememberConnection({
        database: input.database,
        label: input.label,
        provider: "redis",
        tls: input.tls,
        url: input.url
      });
    } catch {
      // Connection failures are surfaced through createConnection.error.
    }
  }

  function handleConnectRemembered(entry: RememberedConnection) {
    setLabel(entry.label);
    setUrl(entry.url);
    void connect({
      database: entry.database,
      label: entry.label,
      tls: entry.tls,
      url: entry.url
    });
  }

  function handleForgetRemembered(id: string) {
    forgetRememberedConnection(id);
  }

  function handleCloseTab(id: string) {
    dispatch({ id, type: "closeTab" });
    deleteConnection.mutate(id);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    if (state.tabs.length === 0) {
      return;
    }

    event.preventDefault();
    const currentIndex = state.tabs.findIndex(
      (tab) => tab.id === state.activeTabId
    );
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      (currentIndex + delta + state.tabs.length) % state.tabs.length;
    const nextTab = state.tabs[nextIndex];

    if (nextTab) {
      dispatch({ id: nextTab.id, type: "activateTab" });
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: "commitSearch", value: searchDraft });
  }

  function handleNamespaceNodeClick(node: NamespaceNode) {
    if (node.kind === "record" && node.resourceId) {
      units.resourceSelected(node.resourceId);
      return;
    }

    units.namespaceSelected(node.path);
  }

  function handleHybridRecordClick(node: NamespaceNode) {
    if (node.resourceId) {
      units.resourceSelected(node.resourceId);
    }
  }

  function runResourceMutation(mutation: MutationRequest) {
    if (activeConnectionId === null) {
      return;
    }

    mutateResource.mutate(mutation, {
      onSuccess: (result) => {
        if (shouldPurgeChangedResources(mutation)) {
          const purgedIds = mutation.resourceId
            ? [mutation.resourceId, ...result.changedResourceIds]
            : result.changedResourceIds;
          dispatch({ resourceIds: purgedIds, type: "purgeResources" });
        }

        refreshVisibleData();
      }
    });
  }

  function handleUpdate() {
    if (activeConnectionId === null || !inspection) {
      return;
    }

    runResourceMutation({
      action: "update",
      resourceId: inspection.resource.id,
      value:
        editorRef.current?.value ?? formatPreviewForEditing(inspection.value)
    });
  }

  function handleExpire() {
    if (activeConnectionId === null || !inspection) {
      return;
    }

    const ttlSeconds = Number(ttlDraft);

    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      return;
    }

    runResourceMutation({
      action: "expire",
      resourceId: inspection.resource.id,
      ttlSeconds
    });
  }

  function handleDelete() {
    if (activeConnectionId === null || !inspection) {
      return;
    }

    const confirmed = window.confirm(
      `Delete Redis key "${inspection.resource.name}"?`
    );

    if (!confirmed) {
      return;
    }

    runResourceMutation({
      action: "delete",
      resourceId: inspection.resource.id
    });
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-[var(--legacy-panel)] text-[var(--legacy-ink)]">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#2C302C] bg-[var(--legacy-charcoal)] px-4">
        <LegacyLogo />
        <Button
          disabled={units.isLoadingResources || !units.selectedConnectionId}
          onClick={() => units.visibleDataRefreshed()}
          title="Refresh resources"
          variant="secondary"
        >
          <RefreshCw
            aria-hidden="true"
            className={clsx(units.isLoadingResources && "animate-spin")}
            size={16}
          />
          Refresh
        </Button>
      </header>

      {state.tabs.length > 0 ? (
        <ConnectionTabStrip
          activeTabId={state.activeTabId}
          onActivate={(id) => dispatch({ id, type: "activateTab" })}
          onClose={handleCloseTab}
          onKeyDown={handleTabKeyDown}
          tabs={state.tabs}
        />
      ) : null}

      {units.error ? <ErrorBanner message={units.error} /> : null}

      <section className="flex min-h-0 flex-1 overflow-hidden">
        {leftCollapsed ? (
          <CollapsedRail
            label="Workspace"
            onExpand={() => setLeftCollapsed(false)}
            side="left"
          />
        ) : (
          <aside className="flex min-h-0 w-[310px] shrink-0 flex-col border-r border-[#C3BAAA] bg-[#F7F1E8]">
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#C3BAAA] px-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#6F675C]">
                Workspace
              </span>
              <button
                aria-label="Collapse Workspace"
                className="rounded-md p-1 text-[#6F675C] transition hover:bg-[#ECE3D6] hover:text-[var(--legacy-ink)]"
                onClick={() => setLeftCollapsed(true)}
                title="Collapse panel"
                type="button"
              >
                <PanelLeftClose aria-hidden="true" size={16} />
              </button>
            </div>
            <ConnectionDrawer
              isConnecting={units.isConnecting}
              label={label}
              onConnectRemembered={handleConnectRemembered}
              onForgetRemembered={handleForgetRemembered}
              onLabelChange={setLabel}
              onSubmit={handleCreateConnection}
              onUrlChange={setUrl}
              remembered={remembered}
              url={url}
            />
            <NamespaceTree
              canLoadMore={hasMoreNamespaces}
              isLoadingMore={namespacesQuery.isFetchingNextPage}
              isLoadingNamespaces={units.isLoadingNamespaces}
              nodes={units.namespaceNodes}
              onHybridRecordClick={handleHybridRecordClick}
              onLoadMore={() => void namespacesQuery.fetchNextPage()}
              onNodeClick={handleNamespaceNodeClick}
              onSelectRoot={() => units.namespaceSelected([])}
              selectedFolderKey={selectedFolderKey}
              selectedNamespacePath={units.selectedNamespacePath}
              selectedResourceId={units.selectedResourceId}
            />
          </aside>
        )}

        <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#FBF7EF]">
          <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[#C3BAAA] bg-[#F7F1E8] px-4">
            {hasSelectedRecord && units.inspection ? (
              <>
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-[#6F675C]">
                    <FileText aria-hidden="true" size={14} />
                    Record content
                  </div>
                  <div className="truncate text-sm font-semibold text-[var(--legacy-ink)]">
                    {units.inspection.resource.name}
                  </div>
                </div>
                <Button
                  onClick={() =>
                    units.namespaceSelected(units.selectedNamespacePath)
                  }
                  variant="secondary"
                >
                  <ArrowLeft aria-hidden="true" size={16} />
                  Back to folder
                </Button>
              </>
            ) : (
              <>
                <div className="min-w-0 pr-4">
                  <div className="text-xs font-medium uppercase text-[#6F675C]">
                    Folder contents
                  </div>
                  <div className="truncate text-sm font-semibold text-[var(--legacy-ink)]">
                    {selectedFolderLabel}
                  </div>
                </div>
                <form
                  className="flex w-full max-w-xl items-center gap-2"
                  onSubmit={handleSearch}
                >
                  <div className="relative flex-1">
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8578]"
                      size={16}
                    />
                    <TextInput
                      className="pl-9"
                      onChange={(event) => setSearchDraft(event.target.value)}
                      placeholder="Search in folder"
                      value={searchDraft}
                    />
                  </div>
                  <Button type="submit" variant="secondary">
                    Search
                  </Button>
                </form>
                <div className="ml-4 whitespace-nowrap text-xs text-[#6F675C]">
                  {scanStatus}
                </div>
              </>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {hasSelectedRecord && units.inspection ? (
              <ValueViewer
                canLoadMore={canLoadMorePreview}
                editorDefaultValue={recordEditorValue}
                editorKey={editorKey}
                editorRef={editorRef}
                inspection={units.inspection}
                isLoadingMore={isLoadingMorePreview}
                onLoadMore={() =>
                  dispatch({ page: previewPage + 1, type: "setPreviewPage" })
                }
                ttlObservedAtMs={inspectionObservedAtMs}
                valueDisplayLabel={valueDisplayLabel}
              />
            ) : (
              <ResourceGrid
                emptyResourceMessage={emptyResourceMessage}
                hasMore={hasMoreResources}
                isLoadingMore={resourcesQuery.isFetchingNextPage}
                isLoadingResources={units.isLoadingResources}
                isRefreshing={isRefreshingResources}
                onLoadMore={() => void resourcesQuery.fetchNextPage()}
                onResourceSelected={units.resourceSelected}
                resources={visibleResources}
                selectedResourceId={units.selectedResourceId}
                ttlObservedAtMs={resourcesObservedAtMs}
              />
            )}
          </div>
        </section>

        {rightCollapsed ? (
          <CollapsedRail
            label="Inspector"
            onExpand={() => setRightCollapsed(false)}
            side="right"
          />
        ) : (
          <aside className="flex min-h-0 w-[380px] shrink-0 flex-col border-l border-[#C3BAAA] bg-[#F7F1E8]">
            <div className="flex h-16 shrink-0 items-center gap-2 border-b border-[#C3BAAA] px-4">
              <button
                aria-label="Collapse Inspector"
                className="rounded-md p-1 text-[#6F675C] transition hover:bg-[#ECE3D6] hover:text-[var(--legacy-ink)]"
                onClick={() => setRightCollapsed(true)}
                title="Collapse panel"
                type="button"
              >
                <PanelRightClose aria-hidden="true" size={16} />
              </button>
              <Pencil aria-hidden="true" size={16} />
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">
                  Record Inspector
                </h2>
                <p className="truncate text-xs text-[#6F675C]">
                  {activeTab?.label ?? "No connection selected"}
                </p>
              </div>
            </div>

            <InspectorPanel
              inspection={units.inspection}
              isInspecting={units.isInspecting}
              isMutating={units.isMutating}
              onDelete={handleDelete}
              onExpire={handleExpire}
              onTtlChange={setTtlDraft}
              onUpdate={handleUpdate}
              ttlDraft={ttlDraft}
              ttlObservedAtMs={inspectionObservedAtMs}
            />
          </aside>
        )}
      </section>
    </main>
  );
}

const EMPTY_PATH: string[] = [];

const EMPTY_NODES: NamespaceNode[] = [];

function resolveErrorMessage(errors: ReadonlyArray<unknown>): string | null {
  for (const candidate of errors) {
    if (candidate instanceof Error && candidate.message) {
      return candidate.message;
    }
  }

  return null;
}
