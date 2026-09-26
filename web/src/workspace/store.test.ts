import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createIdbStore, createMemoryStore, RETENTION_MS, type WorkspaceStore } from "./store";

function setup(factory: (deps: { now: () => number; newId: () => string }) => WorkspaceStore) {
  let now = 1_000_000;
  let n = 0;
  const store = factory({ now: () => now, newId: () => `id${++n}` });
  return { store, advance: (ms: number) => (now += ms) };
}

const file = (name: string) => ({ name, type: "application/pdf", toolId: "merge", blob: new Blob([name]) });

let dbCounter = 0;
const factories: [string, (deps: { now: () => number; newId: () => string }) => WorkspaceStore][] = [
  ["memory", (deps) => createMemoryStore(deps)],
  ["indexeddb", (deps) => createIdbStore({ ...deps, name: `test-${++dbCounter}` })],
];

describe.each(factories)("%s store", (_, factory) => {
  it("adds, lists newest first and gets by id", async () => {
    const { store } = setup(factory);
    const [a, b] = await store.add([file("a.pdf"), file("bb.pdf")]);
    expect(a.size).toBe(5);
    expect((await store.list()).map((f) => f.name)).toEqual(["bb.pdf", "a.pdf"]);
    const [got] = await store.get([b.id, "missing"]);
    expect(got.name).toBe("bb.pdf");
    expect(await got.blob.text()).toBe("bb.pdf");
  });

  it("hides and purges files after the retention period", async () => {
    const { store, advance } = setup(factory);
    const [old] = await store.add([file("old.pdf")]);
    advance(RETENTION_MS + 1);
    await store.add([file("new.pdf")]);
    expect((await store.list()).map((f) => f.name)).toEqual(["new.pdf"]);
    expect(await store.get([old.id])).toEqual([]);
    await store.purgeExpired();
    advance(-RETENTION_MS); // even if the clock goes back, the old file is gone
    expect((await store.list()).map((f) => f.name)).toEqual(["new.pdf"]);
  });

  it("removes, clears and notifies subscribers", async () => {
    const { store } = setup(factory);
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    const [a] = await store.add([file("a.pdf"), file("b.pdf")]);
    await store.remove(a.id);
    expect((await store.list()).map((f) => f.name)).toEqual(["b.pdf"]);
    await store.clear();
    expect(await store.list()).toEqual([]);
    unsubscribe();
    await store.add([file("c.pdf")]);
    expect(calls).toBe(3);
  });
});
