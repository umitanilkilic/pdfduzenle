import type { Dictionary } from "./tr";

export const en: Dictionary = {
  meta: {
    homeTitle: "PDF Düzenle – Free Online PDF Tools",
    homeDescription:
      "Merge, split, compress, rotate, convert PDF to Word and JPG, OCR and more. Free, no sign-up and private: most tools run in your browser so your files never leave your device.",
    titleSuffix: "PDF Düzenle",
  },
  nav: {
    allTools: "All tools",
    menu: "Menu",
    close: "Close",
    theme: "Toggle theme",
    language: "Language",
    history: "Recent files",
    skipToContent: "Skip to content",
  },
  home: {
    eyebrow: "Free · No sign-up · Private",
    heroTitle: "Everything you need for your PDF files",
    heroSubtitle:
      "Merge, split, compress, convert and sign. Most tools run right in your browser without uploading your files anywhere.",
    searchPlaceholder: "Search tools… (e.g. merge, compress, word)",
    searchEmpty: "No tools match your search.",
    toolsTitle: "All PDF tools",
    trustTitle: "Why PDF Düzenle?",
    trust: [
      {
        title: "Your files stay on your device",
        text: "Merging, splitting, rotating and more run in your browser; your file never goes online.",
      },
      {
        title: "Server jobs are deleted right away",
        text: "For compression, conversion and OCR, files are sent over an encrypted connection and deleted once the job is done.",
      },
      {
        title: "Free, no account",
        text: "No sign-up, email or credit card. No watermarks on your output.",
      },
      {
        title: "Chain your tools",
        text: "Send a result to the next tool in one click: merge, then compress, then protect.",
      },
    ],
    faqTitle: "Frequently asked questions",
    faq: [
      {
        q: "Is PDF Düzenle really free?",
        a: "Yes. Every tool is free, needs no account and never adds a watermark to your files.",
      },
      {
        q: "Are my files safe?",
        a: "Browser-based tools never send your file anywhere. Server-based tools transfer files over HTTPS, use them only for the job and delete them automatically within an hour.",
      },
      {
        q: "Can I use it on my phone?",
        a: "Yes. The site works on mobile browsers on Android and iPhone without installing an app.",
      },
      {
        q: "Is there a file size limit?",
        a: "Files processed on our servers can be up to 100 MB. Browser-based tools are limited only by your device's memory.",
      },
    ],
  },
  categories: {
    organize: { name: "Organize", description: "Merge, split, delete and reorder pages." },
    optimize: { name: "Optimize", description: "Reduce size, repair broken files, recognize text." },
    convertTo: { name: "Convert to PDF", description: "Turn images and Office documents into PDF." },
    convertFrom: { name: "Convert from PDF", description: "Turn PDF into images, Word or PDF/A." },
    edit: { name: "Edit", description: "Add numbers, watermarks and signatures; crop." },
    security: { name: "Security", description: "Add or remove a PDF password." },
  },
  tool: {
    home: "Home",
    runsInBrowser: "Runs in your browser – nothing is uploaded",
    runsOnServer: "Processed on a secure server – deleted when done",
    stepsTitle: "How it works",
    faqTitle: "Frequently asked questions",
    relatedTitle: "More tools",
    comingSoon: "This tool is coming very soon.",
  },
  dropzone: {
    choose: "Choose file",
    chooseMany: "Choose files",
    orDrop: "or drop files here",
    addMore: "Add files",
    remove: "Remove",
    wrongType: "This file type is not supported",
  },
  process: {
    start: "Start",
    working: "Processing…",
    uploading: "Uploading…",
    queued: "Waiting in queue…",
    done: "Done!",
    download: "Download",
    downloadAll: "Download all (ZIP)",
    startOver: "Start over",
    continueWith: "Continue with another tool",
    error: "Something went wrong",
    retry: "Try again",
    pages: "pages",
    files: "files",
    savedPercent: "{percent} smaller",
  },
  history: {
    title: "Recent files",
    empty: "Nothing here yet. Processed files are kept on this device only, for 24 hours.",
    clear: "Clear history",
    use: "Use in another tool",
  },
  footer: {
    tagline: "Free and private online PDF tools.",
    tools: "Tools",
    about: "Project",
    rights: "All rights reserved.",
  },
  notFound: {
    title: "Page not found",
    text: "The page you are looking for may have moved or never existed.",
    back: "Back to home",
  },
};
