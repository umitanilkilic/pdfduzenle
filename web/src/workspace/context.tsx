"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createIdbStore, type WorkspaceStore } from "./store";

const WorkspaceContext = createContext<WorkspaceStore | null>(null);

/** Provides the on-device file store. Pass `store` to replace it (tests). */
export function WorkspaceProvider({ store, children }: { store?: WorkspaceStore; children: React.ReactNode }) {
  const [value] = useState(() => store ?? createIdbStore());
  useEffect(() => {
    value.purgeExpired().catch((err) => console.warn("Could not clean up recent files", err));
  }, [value]);
  return <WorkspaceContext value={value}>{children}</WorkspaceContext>;
}

export function useWorkspace(): WorkspaceStore {
  const store = useContext(WorkspaceContext);
  if (!store) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return store;
}
