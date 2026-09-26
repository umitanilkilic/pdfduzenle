import { describe, expect, it, vi } from "vitest";
import { createFileThumbnailer } from "./thumbnails";

const rendered = new Blob(["jpeg"], { type: "image/jpeg" });

describe("createFileThumbnailer", () => {
  it("shows images as they are", async () => {
    const render = vi.fn();
    const image = new File(["png"], "a.png", { type: "image/png" });
    expect(await createFileThumbnailer(render)(image, 100)).toBe(image);
    expect(render).not.toHaveBeenCalled();
  });

  it("renders the first page of a PDF, also when the browser gives no MIME type", async () => {
    const render = vi.fn().mockResolvedValue(rendered);
    const thumbnail = createFileThumbnailer(render);
    expect(await thumbnail(new File(["%PDF"], "a.pdf", { type: "application/pdf" }), 120)).toBe(rendered);
    expect(await thumbnail(new File(["%PDF"], "B.PDF"), 120)).toBe(rendered);
    expect(render).toHaveBeenCalledWith(new TextEncoder().encode("%PDF"), 120);
  });

  it("has no preview for other files", async () => {
    const render = vi.fn();
    const docx = new File(["x"], "a.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(await createFileThumbnailer(render)(docx, 100)).toBeNull();
    expect(render).not.toHaveBeenCalled();
  });

  it("limits how many PDFs render at once", async () => {
    let active = 0;
    let peak = 0;
    const render = vi.fn(async () => {
      peak = Math.max(peak, ++active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return rendered;
    });
    const thumbnail = createFileThumbnailer(render, 2);
    const pdfs = Array.from({ length: 5 }, (_, i) => new File(["%PDF"], `${i}.pdf`, { type: "application/pdf" }));
    await Promise.all(pdfs.map((f) => thumbnail(f, 100)));
    expect(render).toHaveBeenCalledTimes(5);
    expect(peak).toBe(2);
  });
});
