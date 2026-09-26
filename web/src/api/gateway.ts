/** Client for the Go gateway (`/api/*`), used by server-side tools. */

export type JobState = "queued" | "running" | "done" | "failed";

export interface JobOutput {
  name: string;
  size: number;
  contentType: string;
}

export interface JobStatus {
  id: string;
  status: JobState;
  error?: string;
  outputs?: JobOutput[];
}

/** Error codes from the gateway; they map to `dict.errors.*`. */
export type GatewayErrorCode =
  | "encrypted"
  | "wrongPassword"
  | "invalidPdf"
  | "invalidOption"
  | "conversionFailed"
  | "notFound"
  | "rateLimited"
  | "busy"
  | "tooLarge"
  | "unsupportedType"
  | "tooManyFiles"
  | "noFiles"
  | "badRequest"
  | "network";

const KNOWN_CODES = new Set<string>([
  "encrypted",
  "wrongPassword",
  "invalidPdf",
  "invalidOption",
  "conversionFailed",
  "notFound",
  "rateLimited",
  "busy",
  "tooLarge",
  "unsupportedType",
  "tooManyFiles",
  "noFiles",
  "badRequest",
]);

export class GatewayError extends Error {
  constructor(readonly code: GatewayErrorCode) {
    super(code);
    this.name = "GatewayError";
  }
}

export interface GatewayClient {
  submit(tool: string, files: File[], options: Record<string, string>): Promise<JobStatus>;
  status(id: string): Promise<JobStatus>;
  download(id: string, index: number): Promise<Uint8Array>;
  remove(id: string): Promise<void>;
}

export function createGatewayClient(fetchImpl: typeof fetch = (...a) => fetch(...a), base = "/api"): GatewayClient {
  async function request(path: string, init?: RequestInit): Promise<Response> {
    let res: Response;
    try {
      res = await fetchImpl(`${base}${path}`, init);
    } catch {
      throw new GatewayError("network");
    }
    if (!res.ok) throw new GatewayError(await errorCode(res));
    return res;
  }

  return {
    async submit(tool, files, options) {
      const form = new FormData();
      for (const [key, value] of Object.entries(options)) form.append(key, value);
      for (const file of files) form.append("files", file, file.name);
      return (await request(`/tools/${encodeURIComponent(tool)}`, { method: "POST", body: form })).json();
    },
    async status(id) {
      return (await request(`/jobs/${encodeURIComponent(id)}`)).json();
    },
    async download(id, index) {
      const res = await request(`/jobs/${encodeURIComponent(id)}/files/${index}`);
      return new Uint8Array(await res.arrayBuffer());
    },
    async remove(id) {
      await request(`/jobs/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
  };
}

async function errorCode(res: Response): Promise<GatewayErrorCode> {
  if (res.status === 413) return "tooLarge";
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error && KNOWN_CODES.has(body.error)) return body.error as GatewayErrorCode;
  } catch {
    // Non-JSON error page (e.g. from a proxy); fall through to a generic code.
  }
  return res.status === 429 ? "rateLimited" : res.status >= 500 ? "busy" : "badRequest";
}

export type JobStage = "uploading" | "queued" | "working";

export interface RunJobOptions {
  onStage?(stage: JobStage): void;
  /** Injectable for tests. */
  sleep?(ms: number): Promise<void>;
  pollInterval?: number;
}

export interface JobResult {
  output: JobOutput;
  bytes: Uint8Array;
}

/** Uploads, waits for the job, downloads every output and deletes the job from the server. */
export async function runJob(
  client: GatewayClient,
  tool: string,
  files: File[],
  options: Record<string, string>,
  { onStage, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), pollInterval = 1000 }: RunJobOptions = {},
): Promise<JobResult[]> {
  onStage?.("uploading");
  let job = await client.submit(tool, files, options);
  try {
    while (job.status === "queued" || job.status === "running") {
      onStage?.(job.status === "queued" ? "queued" : "working");
      await sleep(pollInterval);
      job = await client.status(job.id);
    }
    if (job.status === "failed") {
      throw new GatewayError(KNOWN_CODES.has(job.error ?? "") ? (job.error as GatewayErrorCode) : "conversionFailed");
    }
    const outputs = job.outputs ?? [];
    return await Promise.all(outputs.map(async (output, i) => ({ output, bytes: await client.download(job.id, i) })));
  } finally {
    // Best effort: the gateway also expires jobs on its own.
    client.remove(job.id).catch(() => {});
  }
}
