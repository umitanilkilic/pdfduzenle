/** Kept in its own module and imported lazily: referencing the worker URL makes the bundler fetch the
 * worker's chunks (pdf-lib, fontkit ≈ 400 KB) as soon as the module is evaluated. */
export function createPdfWorker(): Worker {
  return new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
}
