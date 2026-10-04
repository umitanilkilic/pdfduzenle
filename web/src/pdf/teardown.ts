/**
 * Tracks teardowns in flight so new work can wait for them. pdf.js shares one worker port between
 * documents and rejects opening a document while a previous one is still being destroyed.
 */
export function createTeardownQueue() {
  const pending = new Set<Promise<unknown>>();
  return {
    /** Registers a teardown; returns it unchanged. */
    track<T>(teardown: Promise<T>): Promise<T> {
      const settled = teardown.then(
        () => undefined,
        () => undefined,
      );
      pending.add(settled);
      void settled.then(() => pending.delete(settled));
      return teardown;
    },
    /** Resolves once every teardown registered so far has finished (successfully or not). */
    async idle(): Promise<void> {
      await Promise.all(pending);
    },
  };
}
