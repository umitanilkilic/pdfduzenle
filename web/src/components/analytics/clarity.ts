import "./window";

/** Loads Microsoft Clarity (only ever called after consent) and tells it cookies are allowed. */
export function loadClarity(projectId: string, doc: Document = document, win: Window = window): void {
  if (win.clarity) return;
  const queue: unknown[][] = [];
  const clarity = (...args: unknown[]) => void queue.push(args);
  win.clarity = Object.assign(clarity, { q: queue });
  const script = doc.createElement("script");
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`;
  doc.head.appendChild(script);
  win.clarity("consent");
}
