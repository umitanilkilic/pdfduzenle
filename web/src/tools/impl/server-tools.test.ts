import { describe, expect, it } from "vitest";
import type { GatewayClient, JobStatus } from "@/api/gateway";
import { getDictionary } from "@/i18n";
import { createInlineEngine } from "@/pdf/engine";
import compress from "./compress";
import pdfToWord from "./pdf-to-word";
import ocr from "./ocr";
import protect, { validateProtect } from "./protect";
import { extensionFor } from "./shared/server";
import type { ToolImpl, ToolServices } from "./shared/types";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Gateway fake that finishes every job immediately with one output per file. */
function fakeGateway(contentType = "application/pdf") {
  const submitted: { tool: string; options: Record<string, string>; files: string[] }[] = [];
  let files: File[] = [];
  const client: GatewayClient = {
    async submit(tool, f, options) {
      files = f;
      submitted.push({ tool, options, files: f.map((x) => x.name) });
      return { id: "job", status: "running" } satisfies JobStatus;
    },
    async status() {
      return { id: "job", status: "done", outputs: files.map((f) => ({ name: f.name, size: 3, contentType })) };
    },
    download: async () => Uint8Array.of(1, 2, 3),
    remove: async () => {},
  };
  return { client, submitted };
}

function services(gateway: GatewayClient): ToolServices {
  return {
    engine: createInlineEngine(),
    gateway,
    loadFont: async () => new Uint8Array(),
    dict: getDictionary("tr"),
    locale: "tr",
  };
}

async function run<O>(tool: ToolImpl<O>, s: ToolServices, files: File[], options: Partial<O> = {}) {
  const stages: string[] = [];
  const outputs = await tool.run(
    { files, options: { ...tool.initialOptions(s), ...options }, report: (st) => stages.push(st) },
    s,
  );
  return { outputs, stages };
}

const pdf = (name: string, size = 10) => new File([new Uint8Array(size)], name, { type: "application/pdf" });

describe("server tools", () => {
  it("compress sends the level and names outputs per input", async () => {
    const gw = fakeGateway();
    const { outputs, stages } = await run(compress, services(gw.client), [pdf("a.pdf", 100), pdf("b.pdf")], {
      level: "strong",
    });
    expect(gw.submitted).toEqual([{ tool: "compress", options: { level: "strong" }, files: ["a.pdf", "b.pdf"] }]);
    expect(outputs.map((o) => o.name)).toEqual(["a-sikistirilmis.pdf", "b-sikistirilmis.pdf"]);
    expect(outputs[0].originalSize).toBe(100);
    expect(stages).toEqual(["uploading", "working"]);
  });

  it("pdf-to-word produces a .docx", async () => {
    const gw = fakeGateway(DOCX);
    const { outputs } = await run(pdfToWord, services(gw.client), [pdf("rapor.pdf")]);
    expect(outputs[0]).toMatchObject({ name: "rapor-word.docx", type: DOCX });
  });

  it("protect sends password and permissions as strings", async () => {
    const gw = fakeGateway();
    await run(protect, services(gw.client), [pdf("a.pdf")], { password: "s", confirm: "s", allowCopy: false });
    expect(gw.submitted[0].options).toEqual({ password: "s", allowPrint: "true", allowCopy: "false" });
  });

  it("ocr forwards mode, format and language and names text output .txt", async () => {
    const gw = fakeGateway("text/plain; charset=utf-8");
    const { outputs } = await run(ocr, services(gw.client), [pdf("tarama.pdf")], { output: "txt", engine: "fast" });
    expect(gw.submitted[0]).toMatchObject({
      tool: "ocr",
      options: { output: "txt", engine: "fast", languages: "tur+eng" },
    });
    expect(outputs[0].name).toBe("tarama-ocr.txt");
  });

  it("maps content types to extensions", () => {
    expect(extensionFor("text/plain; charset=utf-8")).toBe("txt");
    expect(extensionFor("application/pdf")).toBe("pdf");
    expect(extensionFor("application/octet-stream")).toBe("pdf");
  });

  it("protect validates the password before uploading", () => {
    const base = { allowPrint: true, allowCopy: true };
    expect(validateProtect({ ...base, password: "", confirm: "" })).toBe("emptySelection");
    expect(validateProtect({ ...base, password: "a", confirm: "b" })).toBe("passwordMismatch");
    expect(validateProtect({ ...base, password: "a", confirm: "a" })).toBeNull();
  });
});
