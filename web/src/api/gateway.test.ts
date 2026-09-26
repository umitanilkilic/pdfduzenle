import { describe, expect, it, vi } from "vitest";
import { createGatewayClient, GatewayError, runJob, type GatewayClient, type JobStatus } from "./gateway";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("createGatewayClient", () => {
  it("posts files and options as multipart form data", async () => {
    const fetchImpl = vi.fn(async () => json(202, { id: "j1", status: "queued" }));
    const client = createGatewayClient(fetchImpl as unknown as typeof fetch);
    const file = new File(["%PDF-"], "Rapor.pdf", { type: "application/pdf" });

    expect(await client.submit("compress", [file], { level: "strong" })).toEqual({ id: "j1", status: "queued" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/tools/compress");
    const form = init.body as FormData;
    expect(form.get("level")).toBe("strong");
    expect((form.get("files") as File).name).toBe("Rapor.pdf");
  });

  it.each([
    [json(400, { error: "wrongPassword" }), "wrongPassword"],
    [json(429, { error: "rateLimited" }), "rateLimited"],
    [new Response("<html>", { status: 502 }), "busy"],
    [new Response("", { status: 413 }), "tooLarge"],
    [json(400, { error: "somethingNew" }), "badRequest"],
  ])("maps error responses to codes (%#)", async (response, code) => {
    const client = createGatewayClient((async () => response) as unknown as typeof fetch);
    await expect(client.status("x")).rejects.toMatchObject({ code });
  });

  it("reports network failures", async () => {
    const client = createGatewayClient((async () => {
      throw new TypeError("offline");
    }) as unknown as typeof fetch);
    await expect(client.status("x")).rejects.toBeInstanceOf(GatewayError);
    await expect(client.status("x")).rejects.toMatchObject({ code: "network" });
  });
});

function fakeClient(states: JobStatus[]): GatewayClient & { removed: string[] } {
  const removed: string[] = [];
  let i = 0;
  return {
    removed,
    submit: async () => states[i++],
    status: async () => states[i++],
    download: async (_id, index) => Uint8Array.of(index + 1),
    remove: async (id) => {
      removed.push(id);
    },
  };
}

describe("runJob", () => {
  const noSleep = async () => {};
  const file = new File(["x"], "a.pdf");

  it("polls until done, downloads outputs and cleans up", async () => {
    const outputs = [
      { name: "a.pdf", size: 1, contentType: "application/pdf" },
      { name: "b.pdf", size: 1, contentType: "application/pdf" },
    ];
    const client = fakeClient([
      { id: "j", status: "queued" },
      { id: "j", status: "running" },
      { id: "j", status: "done", outputs },
    ]);
    const stages: string[] = [];
    const result = await runJob(client, "compress", [file], {}, { sleep: noSleep, onStage: (s) => stages.push(s) });

    expect(stages).toEqual(["uploading", "queued", "working"]);
    expect(result.map((r) => [r.output.name, [...r.bytes]])).toEqual([
      ["a.pdf", [1]],
      ["b.pdf", [2]],
    ]);
    expect(client.removed).toEqual(["j"]);
  });

  it("throws the job's error code and still cleans up", async () => {
    const client = fakeClient([
      { id: "j", status: "running" },
      { id: "j", status: "failed", error: "wrongPassword" },
    ]);
    await expect(runJob(client, "unlock", [file], {}, { sleep: noSleep })).rejects.toMatchObject({
      code: "wrongPassword",
    });
    expect(client.removed).toEqual(["j"]);
  });

  it("uses a generic code for unknown job errors", async () => {
    const client = fakeClient([{ id: "j", status: "failed", error: "weird" }]);
    await expect(runJob(client, "x", [file], {}, { sleep: noSleep })).rejects.toMatchObject({
      code: "conversionFailed",
    });
  });
});
