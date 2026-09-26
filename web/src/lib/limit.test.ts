import { describe, expect, it } from "vitest";
import { createLimiter } from "./limit";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe("createLimiter", () => {
  it("never runs more than the limit at once and keeps call order", async () => {
    const run = createLimiter(2);
    const gates = [deferred(), deferred(), deferred(), deferred()];
    const started: number[] = [];
    let active = 0;
    let peak = 0;
    const results = gates.map((gate, i) =>
      run(async () => {
        started.push(i);
        peak = Math.max(peak, ++active);
        await gate.promise;
        active--;
        return i;
      }),
    );
    await Promise.resolve();
    expect(started).toEqual([0, 1]);
    gates.forEach((g) => g.resolve());
    expect(await Promise.all(results)).toEqual([0, 1, 2, 3]);
    expect(started).toEqual([0, 1, 2, 3]);
    expect(peak).toBe(2);
  });

  it("frees the slot when a task fails", async () => {
    const run = createLimiter(1);
    await expect(run(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect(await run(async () => "ok")).toBe("ok");
  });
});
