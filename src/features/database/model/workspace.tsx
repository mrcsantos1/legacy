"use client";

import {
    createContext,
    useContext,
    useMemo,
    useReducer,
    type Dispatch,
    type ReactNode
} from "react";

import type { ConnectionSummary, NamespaceNode } from "@/shared/api/client";

import {
    mergeNamespaceNodes,
    removeNamespaceNodesForResourceIds
} from "./namespace-tree";

export interface WorkspaceTab {
  readonly id: string;
  readonly label: string;
  readonly namespaceNodes: NamespaceNode[];
  readonly namespacePath: string[];
  readonly previewPage: number;
  readonly search: string;
  readonly searchDraft: string;
  readonly selectedResourceId: string | null;
}

export interface WorkspaceState {
  readonly activeTabId: string | null;
  readonly tabs: WorkspaceTab[];
}

export type WorkspaceAction =
  | { readonly connections: ConnectionSummary[]; readonly type: "syncConnections" }
  | { readonly id: string; readonly label: string; readonly type: "openTab" }
  | { readonly id: string; readonly type: "closeTab" }
  | { readonly id: string; readonly type: "activateTab" }
  | { readonly path: string[]; readonly type: "selectNamespace" }
  | {
      readonly nodes: NamespaceNode[];
      readonly path: string[];
      readonly type: "mergeNamespaces";
    }
  | { readonly type: "setSearchDraft"; readonly value: string }
  | { readonly type: "commitSearch"; readonly value: string }
  | { readonly resourceId: string; readonly type: "selectResource" }
  | { readonly type: "clearSelectedResource" }
  | { readonly resourceIds: string[]; readonly type: "purgeResources" }
  | { readonly page: number; readonly type: "setPreviewPage" };

export const initialWorkspaceState: WorkspaceState = {
  activeTabId: null,
  tabs: []
};

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction
): WorkspaceState {
  switch (action.type) {
    case "syncConnections": {
      const ids = new Set(action.connections.map((connection) => connection.id));
      const existing = new Map(state.tabs.map((tab) => [tab.id, tab]));
      const tabs = action.connections.map(
        (connection) =>
          existing.get(connection.id) ??
          createTab(connection.id, connection.label)
      );
      const activeTabId =
        state.activeTabId !== null && ids.has(state.activeTabId)
          ? state.activeTabId
          : (tabs[0]?.id ?? null);

      return { activeTabId, tabs };
    }
    case "openTab": {
      if (state.tabs.some((tab) => tab.id === action.id)) {
        return { ...state, activeTabId: action.id };
      }

      return {
        activeTabId: action.id,
        tabs: [...state.tabs, createTab(action.id, action.label)]
      };
    }
    case "closeTab": {
      const index = state.tabs.findIndex((tab) => tab.id === action.id);

      if (index === -1) {
        return state;
      }

      const tabs = state.tabs.filter((tab) => tab.id !== action.id);
      const activeTabId =
        state.activeTabId === action.id
          ? (tabs[index]?.id ?? tabs[index - 1]?.id ?? null)
          : state.activeTabId;

      return { activeTabId, tabs };
    }
    case "activateTab":
      return state.tabs.some((tab) => tab.id === action.id)
        ? { ...state, activeTabId: action.id }
        : state;
    case "selectNamespace":
      return mapActiveTab(state, (tab) => ({
        ...tab,
        namespacePath: action.path,
        previewPage: 1,
        selectedResourceId: null
      }));
    case "mergeNamespaces":
      return mapActiveTab(state, (tab) => ({
        ...tab,
        namespaceNodes: mergeNamespaceNodes(
          tab.namespaceNodes,
          action.path,
          action.nodes
        )
      }));
    case "setSearchDraft":
      return mapActiveTab(state, (tab) => ({ ...tab, searchDraft: action.value }));
    case "commitSearch":
      return mapActiveTab(state, (tab) => ({ ...tab, search: action.value }));
    case "selectResource":
      return mapActiveTab(state, (tab) => ({
        ...tab,
        previewPage:
          tab.selectedResourceId === action.resourceId ? tab.previewPage : 1,
        selectedResourceId: action.resourceId
      }));
    case "clearSelectedResource":
      return mapActiveTab(state, (tab) => ({
        ...tab,
        previewPage: 1,
        selectedResourceId: null
      }));
    case "purgeResources":
      return mapActiveTab(state, (tab) => {
        const selectionPurged =
          tab.selectedResourceId !== null &&
          action.resourceIds.includes(tab.selectedResourceId);

        return {
          ...tab,
          namespaceNodes: removeNamespaceNodesForResourceIds(
            tab.namespaceNodes,
            action.resourceIds
          ),
          previewPage: selectionPurged ? 1 : tab.previewPage,
          selectedResourceId: selectionPurged ? null : tab.selectedResourceId
        };
      });
    case "setPreviewPage":
      return mapActiveTab(state, (tab) => ({
        ...tab,
        previewPage: Math.max(1, action.page)
      }));
    default:
      return state;
  }
}

export function activeTabOf(state: WorkspaceState): WorkspaceTab | null {
  return state.tabs.find((tab) => tab.id === state.activeTabId) ?? null;
}

interface WorkspaceContextValue {
  readonly dispatch: Dispatch<WorkspaceAction>;
  readonly state: WorkspaceState;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  children
}: {
  readonly children: ReactNode;
}) {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspaceState);
  const value = useMemo(() => ({ dispatch, state }), [state]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);

  if (value === null) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }

  return value;
}

function createTab(id: string, label: string): WorkspaceTab {
  return {
    id,
    label,
    namespaceNodes: [],
    namespacePath: [],
    previewPage: 1,
    search: "",
    searchDraft: "",
    selectedResourceId: null
  };
}

function mapActiveTab(
  state: WorkspaceState,
  update: (tab: WorkspaceTab) => WorkspaceTab
): WorkspaceState {
  if (state.activeTabId === null) {
    return state;
  }

  return {
    ...state,
    tabs: state.tabs.map((tab) =>
      tab.id === state.activeTabId ? update(tab) : tab
    )
  };
}
