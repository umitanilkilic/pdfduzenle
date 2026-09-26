import { openDB, type DBSchema, type IDBPDatabase } from "idb";

/** A tool output kept on this device so it can be reused in another tool. */
export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  /** Tool that produced the file. */
  toolId: string;
  createdAt: number;
  blob: Blob;
}

export type NewFile = Omit<StoredFile, "id" | "createdAt" | "size">;

export interface WorkspaceStore {
  add(files: NewFile[]): Promise<StoredFile[]>;
  get(ids: string[]): Promise<StoredFile[]>;
  /** Newest first. */
  list(): Promise<StoredFile[]>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
  /** Deletes files older than the retention period. */
  purgeExpired(): Promise<void>;
  subscribe(listener: () => void): () => void;
}

export const RETENTION_MS = 24 * 60 * 60 * 1000;

interface Deps {
  now?: () => number;
  newId?: () => string;
}

/** Shared behaviour: ids, timestamps, change notifications. Storage is supplied by the backend. */
function createStore(
  backend: {
    put(file: StoredFile): Promise<void>;
    get(id: string): Promise<StoredFile | undefined>;
    all(): Promise<StoredFile[]>;
    delete(id: string): Promise<void>;
    clear(): Promise<void>;
  },
  { now = Date.now, newId = () => crypto.randomUUID() }: Deps,
): WorkspaceStore {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  return {
    async add(files) {
      const stored = files.map((f, i) => ({ ...f, id: newId(), size: f.blob.size, createdAt: now() + i }));
      for (const file of stored) await backend.put(file);
      if (stored.length) notify();
      return stored;
    },
    async get(ids) {
      const found = await Promise.all(ids.map((id) => backend.get(id)));
      const cutoff = now() - RETENTION_MS;
      return found.filter((f): f is StoredFile => !!f && f.createdAt >= cutoff);
    },
    async list() {
      const cutoff = now() - RETENTION_MS;
      return (await backend.all()).filter((f) => f.createdAt >= cutoff).sort((a, b) => b.createdAt - a.createdAt);
    },
    async remove(id) {
      await backend.delete(id);
      notify();
    },
    async clear() {
      await backend.clear();
      notify();
    },
    async purgeExpired() {
      const cutoff = now() - RETENTION_MS;
      const expired = (await backend.all()).filter((f) => f.createdAt < cutoff);
      for (const f of expired) await backend.delete(f.id);
      if (expired.length) notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function createMemoryStore(deps: Deps = {}): WorkspaceStore {
  const files = new Map<string, StoredFile>();
  return createStore(
    {
      put: async (f) => void files.set(f.id, f),
      get: async (id) => files.get(id),
      all: async () => [...files.values()],
      delete: async (id) => void files.delete(id),
      clear: async () => files.clear(),
    },
    deps,
  );
}

interface Schema extends DBSchema {
  files: { key: string; value: StoredFile };
}

/** IndexedDB-backed store; the database opens lazily on first use. */
export function createIdbStore(deps: Deps & { name?: string } = {}): WorkspaceStore {
  let db: Promise<IDBPDatabase<Schema>> | null = null;
  const open = () => {
    db ??= openDB<Schema>(deps.name ?? "pdfduzenle", 1, {
      upgrade(database) {
        database.createObjectStore("files", { keyPath: "id" });
      },
    });
    return db;
  };
  return createStore(
    {
      put: async (f) => void (await (await open()).put("files", f)),
      get: async (id) => (await open()).get("files", id),
      all: async () => (await open()).getAll("files"),
      delete: async (id) => (await open()).delete("files", id),
      clear: async () => (await open()).clear("files"),
    },
    deps,
  );
}
