import type { Locale } from "@/i18n/config";

export type ToolCategory = "organize" | "optimize" | "convertTo" | "convertFrom" | "edit" | "security";

/** Where the work happens: in the visitor's browser or on our backend. */
export type ToolRuntime = "browser" | "server";

export type ToolId =
  | "merge"
  | "split"
  | "remove-pages"
  | "extract-pages"
  | "organize"
  | "rotate"
  | "compress"
  | "repair"
  | "ocr"
  | "jpg-to-pdf"
  | "word-to-pdf"
  | "excel-to-pdf"
  | "powerpoint-to-pdf"
  | "pdf-to-jpg"
  | "pdf-to-word"
  | "pdf-to-pdfa"
  | "page-numbers"
  | "watermark"
  | "crop"
  | "sign"
  | "metadata"
  | "protect"
  | "unlock";

export type ToolIcon =
  | "Combine"
  | "Scissors"
  | "FileMinus"
  | "FileOutput"
  | "LayoutGrid"
  | "RotateCw"
  | "Minimize2"
  | "Wrench"
  | "ScanText"
  | "FileImage"
  | "FileText"
  | "Sheet"
  | "Presentation"
  | "Image"
  | "FileArchive"
  | "Hash"
  | "Droplets"
  | "Crop"
  | "Signature"
  | "Info"
  | "Lock"
  | "LockOpen";

export interface ToolDefinition {
  id: ToolId;
  slug: Record<Locale, string>;
  category: ToolCategory;
  runtime: ToolRuntime;
  icon: ToolIcon;
  /** Value for the file input `accept` attribute. */
  accept: string;
  /** Whether the tool takes several input files at once. */
  multiple: boolean;
  /** Tools suggested as the next step after this one finishes. */
  next: ToolId[];
}

const PDF = "application/pdf,.pdf";
const IMAGES = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const WORD = ".doc,.docx,.odt,.rtf,.txt";
const EXCEL = ".xls,.xlsx,.ods,.csv";
const POWERPOINT = ".ppt,.pptx,.odp";
const SCANS = "image/jpeg,image/png,image/tiff,.jpg,.jpeg,.png,.tif,.tiff";

export const tools: ToolDefinition[] = [
  // Organize
  {
    id: "merge",
    slug: { tr: "pdf-birlestir", en: "merge-pdf" },
    category: "organize",
    runtime: "browser",
    icon: "Combine",
    accept: PDF,
    multiple: true,
    next: ["compress", "page-numbers", "organize"],
  },
  {
    id: "split",
    slug: { tr: "pdf-bol", en: "split-pdf" },
    category: "organize",
    runtime: "browser",
    icon: "Scissors",
    accept: PDF,
    multiple: false,
    next: ["compress", "merge"],
  },
  {
    id: "remove-pages",
    slug: { tr: "pdf-sayfa-sil", en: "remove-pdf-pages" },
    category: "organize",
    runtime: "browser",
    icon: "FileMinus",
    accept: PDF,
    multiple: false,
    next: ["compress", "page-numbers"],
  },
  {
    id: "extract-pages",
    slug: { tr: "pdf-sayfa-cikar", en: "extract-pdf-pages" },
    category: "organize",
    runtime: "browser",
    icon: "FileOutput",
    accept: PDF,
    multiple: false,
    next: ["merge", "compress"],
  },
  {
    id: "organize",
    slug: { tr: "pdf-sayfa-duzenle", en: "organize-pdf" },
    category: "organize",
    runtime: "browser",
    icon: "LayoutGrid",
    accept: PDF,
    multiple: false,
    next: ["compress", "page-numbers"],
  },
  {
    id: "rotate",
    slug: { tr: "pdf-dondur", en: "rotate-pdf" },
    category: "organize",
    runtime: "browser",
    icon: "RotateCw",
    accept: PDF,
    multiple: true,
    next: ["merge", "compress"],
  },
  // Optimize
  {
    id: "compress",
    slug: { tr: "pdf-sikistir", en: "compress-pdf" },
    category: "optimize",
    runtime: "server",
    icon: "Minimize2",
    accept: PDF,
    multiple: true,
    next: ["protect", "merge"],
  },
  {
    id: "repair",
    slug: { tr: "pdf-onar", en: "repair-pdf" },
    category: "optimize",
    runtime: "server",
    icon: "Wrench",
    accept: PDF,
    multiple: true,
    next: ["compress", "ocr"],
  },
  {
    id: "ocr",
    slug: { tr: "pdf-ocr", en: "ocr-pdf" },
    category: "optimize",
    runtime: "server",
    icon: "ScanText",
    accept: `${PDF},${SCANS}`,
    multiple: false,
    next: ["compress", "pdf-to-word"],
  },
  // Convert to PDF
  {
    id: "jpg-to-pdf",
    slug: { tr: "jpg-pdf-cevir", en: "jpg-to-pdf" },
    category: "convertTo",
    runtime: "browser",
    icon: "FileImage",
    accept: IMAGES,
    multiple: true,
    next: ["compress", "ocr", "merge"],
  },
  {
    id: "word-to-pdf",
    slug: { tr: "word-pdf-cevir", en: "word-to-pdf" },
    category: "convertTo",
    runtime: "server",
    icon: "FileText",
    accept: WORD,
    multiple: true,
    next: ["merge", "compress", "protect"],
  },
  {
    id: "excel-to-pdf",
    slug: { tr: "excel-pdf-cevir", en: "excel-to-pdf" },
    category: "convertTo",
    runtime: "server",
    icon: "Sheet",
    accept: EXCEL,
    multiple: true,
    next: ["merge", "compress"],
  },
  {
    id: "powerpoint-to-pdf",
    slug: { tr: "powerpoint-pdf-cevir", en: "powerpoint-to-pdf" },
    category: "convertTo",
    runtime: "server",
    icon: "Presentation",
    accept: POWERPOINT,
    multiple: true,
    next: ["merge", "compress"],
  },
  // Convert from PDF
  {
    id: "pdf-to-jpg",
    slug: { tr: "pdf-jpg-cevir", en: "pdf-to-jpg" },
    category: "convertFrom",
    runtime: "browser",
    icon: "Image",
    accept: PDF,
    multiple: false,
    next: [],
  },
  {
    id: "pdf-to-word",
    slug: { tr: "pdf-word-cevir", en: "pdf-to-word" },
    category: "convertFrom",
    runtime: "server",
    icon: "FileText",
    accept: PDF,
    multiple: false,
    next: [],
  },
  {
    id: "pdf-to-pdfa",
    slug: { tr: "pdf-pdfa-cevir", en: "pdf-to-pdfa" },
    category: "convertFrom",
    runtime: "server",
    icon: "FileArchive",
    accept: PDF,
    multiple: false,
    next: ["protect"],
  },
  // Edit
  {
    id: "page-numbers",
    slug: { tr: "pdf-sayfa-numarasi-ekle", en: "add-page-numbers" },
    category: "edit",
    runtime: "browser",
    icon: "Hash",
    accept: PDF,
    multiple: false,
    next: ["compress", "watermark"],
  },
  {
    id: "watermark",
    slug: { tr: "pdf-filigran-ekle", en: "add-watermark" },
    category: "edit",
    runtime: "browser",
    icon: "Droplets",
    accept: PDF,
    multiple: false,
    next: ["protect", "compress"],
  },
  {
    id: "crop",
    slug: { tr: "pdf-kirp", en: "crop-pdf" },
    category: "edit",
    runtime: "browser",
    icon: "Crop",
    accept: PDF,
    multiple: false,
    next: ["compress"],
  },
  {
    id: "sign",
    slug: { tr: "pdf-imzala", en: "sign-pdf" },
    category: "edit",
    runtime: "browser",
    icon: "Signature",
    accept: PDF,
    multiple: false,
    next: ["protect", "compress"],
  },
  {
    id: "metadata",
    slug: { tr: "pdf-bilgilerini-duzenle", en: "edit-pdf-metadata" },
    category: "edit",
    runtime: "browser",
    icon: "Info",
    accept: PDF,
    multiple: false,
    next: ["compress"],
  },
  // Security
  {
    id: "protect",
    slug: { tr: "pdf-sifrele", en: "protect-pdf" },
    category: "security",
    runtime: "server",
    icon: "Lock",
    accept: PDF,
    multiple: false,
    next: [],
  },
  {
    id: "unlock",
    slug: { tr: "pdf-sifre-kaldir", en: "unlock-pdf" },
    category: "security",
    runtime: "server",
    icon: "LockOpen",
    accept: PDF,
    multiple: false,
    next: ["compress", "merge"],
  },
];

export const categoryOrder: ToolCategory[] = ["organize", "optimize", "convertTo", "convertFrom", "edit", "security"];

const byId = new Map(tools.map((tool) => [tool.id, tool]));

export function getTool(id: ToolId): ToolDefinition {
  const tool = byId.get(id);
  if (!tool) throw new Error(`Unknown tool: ${id}`);
  return tool;
}

export function findToolBySlug(locale: Locale, slug: string): ToolDefinition | undefined {
  return tools.find((tool) => tool.slug[locale] === slug);
}

export function toolsInCategory(category: ToolCategory): ToolDefinition[] {
  return tools.filter((tool) => tool.category === category);
}
