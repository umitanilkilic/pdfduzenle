declare global {
  interface Window {
    /** Set by the gtag bootstrap when Google Analytics is configured. */
    gtag?: (...args: unknown[]) => void;
    /** Set by the Clarity loader after consent. */
    clarity?: (...args: unknown[]) => void;
  }
}

export {};
