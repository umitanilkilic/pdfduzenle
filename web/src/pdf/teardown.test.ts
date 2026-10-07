import { describe, expect, it } from "vitest";
import { createTeardownQueue } from "./teardown";

function deferred() {
  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("createTeardownQueue", () => {
  it("waits for every teardown in flight, including failed ones", async () => {
    const queue = createTeardownQueue();
    const a = deferred();
    const b = deferred();
    queue.track(a.promise);
    queue.track(b.promise).catch(() => {});
    let idle = false;
    const waiting = queue.idle().then(() => (idle = true));
    a.resolve();
    await Promise.resolve();
    expect(idle).toBe(false);
    b.reject(new Error("destroy failed"));
    await waiting;
    expect(idle).toBe(true);
  });

  it("is idle immediately when nothing is pending", async () => {
    await expect(createTeardownQueue().idle()).resolves.toBeUndefined();
  });

  it("returns the tracked promise unchanged", async () => {
    const queue = createTeardownQueue();
    await expect(queue.track(Promise.resolve(42))).resolves.toBe(42);
  });
});
