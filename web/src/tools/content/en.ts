import type { ToolContentMap } from "./types";

const PRIVATE_FAQ = {
  q: "Is my file uploaded to a server?",
  a: "No. This tool runs entirely in your browser, so your file never leaves your device. The job finishes even if you lose your connection while the page is open.",
};

const SERVER_FAQ = {
  q: "Is my file safe?",
  a: "Your file is sent to our server over an encrypted (HTTPS) connection, used only for this job and deleted automatically once it is done, within an hour at most.",
};

export const enTools: ToolContentMap = {
  merge: {
    name: "Merge PDF",
    short: "Combine multiple PDFs into one file in the order you want.",
    metaTitle: "Merge PDF – Combine PDF Files Online for Free",
    metaDescription:
      "Merge PDF files in seconds for free. Drag to reorder and combine into a single PDF. Nothing is uploaded; everything runs in your browser.",
    h1: "Merge PDF",
    lead: "Combine several PDF files into one, in any order. No sign-up, no watermark, and your files never leave your device.",
    steps: [
      "Select or drop the PDF files you want to merge.",
      "Drag the files into the order you want.",
      "Click “Start” and download the merged PDF.",
    ],
    faq: [
      {
        q: "How many PDFs can I merge?",
        a: "There is no fixed limit. Only your device's memory sets the limit, so files with hundreds of pages are fine.",
      },
      {
        q: "Does merging reduce quality?",
        a: "No. Pages are copied as they are; text, images and links are preserved.",
      },
      PRIVATE_FAQ,
    ],
    keywords: ["merge", "combine", "join", "one pdf"],
  },
  split: {
    name: "Split PDF",
    short: "Split a PDF into page ranges or single pages.",
    metaTitle: "Split PDF – Separate PDF Pages Online",
    metaDescription:
      "Split a PDF into page ranges or save every page as its own file, for free. Fast, private and no sign-up; the file is processed in your browser.",
    h1: "Split PDF",
    lead: "Split a PDF into several files by page range, or save every page as a separate PDF.",
    steps: [
      "Select the PDF you want to split.",
      "Enter page ranges (e.g. 1-3, 4-8) or choose “split every page”.",
      "Click “Start” and download the parts one by one or as a ZIP.",
    ],
    faq: [
      {
        q: "How do I write page ranges?",
        a: "Separate ranges with commas. For example “1-3, 5, 7-10” creates three separate PDFs.",
      },
      PRIVATE_FAQ,
    ],
    keywords: ["split", "separate", "divide", "cut pages"],
  },
  "remove-pages": {
    name: "Remove Pages",
    short: "Delete the pages you don't need from a PDF.",
    metaTitle: "Remove PDF Pages – Delete Pages from a PDF",
    metaDescription:
      "Preview and pick the pages you want to delete from a PDF. Free and no sign-up; the file is processed in your browser without uploading.",
    h1: "Remove Pages from PDF",
    lead: "Click on page thumbnails to choose the pages to delete and download a clean PDF.",
    steps: [
      "Select your PDF; pages are shown as thumbnails.",
      "Click the pages you want to delete or type their numbers.",
      "Click “Start” and download the new PDF.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["delete pages", "remove pages", "delete"],
  },
  "extract-pages": {
    name: "Extract Pages",
    short: "Create a new PDF from the pages you select.",
    metaTitle: "Extract PDF Pages – Save Selected Pages as a New PDF",
    metaDescription:
      "Pick the pages you need from a PDF and save them as a separate file. Free and private; runs in your browser.",
    h1: "Extract Pages from PDF",
    lead: "Choose only the pages you need and create a new PDF from them.",
    steps: [
      "Select your PDF.",
      "Click the pages you want or type their numbers.",
      "Click “Start” and download the new PDF.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["extract", "select pages", "pick pages"],
  },
  organize: {
    name: "Organize Pages",
    short: "Drag to reorder, rotate or delete pages.",
    metaTitle: "Organize PDF – Reorder, Rotate and Delete Pages",
    metaDescription:
      "Reorder PDF pages by dragging thumbnails, rotate or delete them. Free, no sign-up and entirely in your browser.",
    h1: "Organize PDF Pages",
    lead: "See every page at once; drag and drop to reorder, rotate or delete with a click.",
    steps: [
      "Select your PDF; all pages open as thumbnails.",
      "Drag pages into order and use the rotate and delete buttons.",
      "Click “Start” and download the organized PDF.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["reorder", "organize", "sort pages", "move pages", "arrange"],
  },
  rotate: {
    name: "Rotate PDF",
    short: "Rotate pages by 90°, 180° or 270°.",
    metaTitle: "Rotate PDF – Rotate PDF Pages Permanently",
    metaDescription:
      "Fix sideways or upside-down PDF pages with a click and save them permanently. Free; the file is processed in your browser.",
    h1: "Rotate PDF",
    lead: "Rotate every page or only the ones you select and save the result permanently.",
    steps: [
      "Select the PDFs you want to rotate.",
      "Choose the direction and angle.",
      "Click “Start” and download the rotated PDF.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["rotate", "turn", "sideways", "upside down"],
  },
  compress: {
    name: "Compress PDF",
    short: "Reduce file size while keeping visual quality.",
    metaTitle: "Compress PDF – Reduce PDF File Size Online",
    metaDescription:
      "Reduce PDF file size without visible quality loss. Ideal for email and upload limits. Free, no sign-up, files are deleted after processing.",
    h1: "Compress PDF",
    lead: "Shrink your PDF so it fits email attachments and upload size limits.",
    steps: [
      "Select the PDFs you want to compress.",
      "Choose a compression level: recommended, strong or light.",
      "Click “Start” and download the smaller PDF.",
    ],
    faq: [
      {
        q: "How much smaller will it get?",
        a: "It depends on the content. Scanned documents and photo-heavy PDFs often shrink by 50–90%; text-only files gain less.",
      },
      {
        q: "Which level should I choose?",
        a: "“Recommended” gives the best balance of quality and size in most cases. Try “strong” if you have a strict size limit.",
      },
      SERVER_FAQ,
    ],
    keywords: ["compress", "reduce size", "shrink", "smaller", "optimize"],
  },
  repair: {
    name: "Repair PDF",
    short: "Recover PDF files that won't open or are corrupted.",
    metaTitle: "Repair PDF – Fix Corrupted PDF Files",
    metaDescription:
      "Try to fix PDF files that won't open, show errors or are corrupted, for free. Your file is deleted automatically after processing.",
    h1: "Repair PDF",
    lead: "Rebuild the internal structure to recover PDF files that won't open or show errors.",
    steps: [
      "Select the PDF you want to repair.",
      "Click “Start”; the file structure is rebuilt.",
      "Download the repaired PDF.",
    ],
    faq: [
      {
        q: "Can every file be repaired?",
        a: "No. If the content itself is lost it can't be recovered, but most broken tables and structural errors can be fixed.",
      },
      SERVER_FAQ,
    ],
    keywords: ["repair", "fix", "corrupted", "broken", "recover"],
  },
  ocr: {
    name: "OCR – Text Recognition",
    short: "Turn text in scanned PDFs and images into selectable text.",
    metaTitle: "OCR PDF – Convert Scanned PDF to Searchable Text",
    metaDescription:
      "Turn scanned PDFs and photos into searchable, copyable text. Unlimited-OCR keeps tables and layout and exports to Word.",
    h1: "OCR PDF – Text Recognition",
    lead: "Convert scanned documents into searchable PDF, plain text or Word. Supports Turkish, English and more.",
    steps: [
      "Select a scanned PDF or image.",
      "Choose the document language and OCR mode: Fast or Unlimited-OCR.",
      "Click “Start” and download the searchable PDF or text when done.",
    ],
    faq: [
      {
        q: "What is the difference between Fast and Unlimited-OCR?",
        a: "Fast OCR uses classic text recognition to produce a searchable PDF. Unlimited-OCR uses an AI vision-language model that better preserves tables, headings and layout, and can export to Word.",
      },
      {
        q: "Does it recognize handwriting?",
        a: "Fast OCR is designed for printed text. Unlimited-OCR does better on legible handwriting, but results are not guaranteed to be perfect.",
      },
      {
        q: "Is my file safe, and where is it sent?",
        a: "In Fast mode your file is processed only on our own server. In Unlimited-OCR mode page images are sent over an encrypted connection to the GPU server running the AI model and are not stored after processing. Choose Fast mode for documents with personal data. All files are deleted within an hour after the job.",
      },
    ],
    keywords: ["ocr", "text recognition", "scanned", "scan", "image to text", "searchable"],
  },
  "jpg-to-pdf": {
    name: "JPG to PDF",
    short: "Convert JPG, PNG and WebP images to PDF.",
    metaTitle: "JPG to PDF – Convert Images to PDF Online",
    metaDescription:
      "Combine JPG, PNG and WebP images into a single PDF. Choose page size and margins. Free; your images are never uploaded.",
    h1: "JPG to PDF",
    lead: "Turn your photos and images into a single PDF file, in any order.",
    steps: [
      "Select your JPG, PNG or WebP images.",
      "Set the order, page size and margin.",
      "Click “Start” and download the PDF.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["jpg", "png", "image", "photo", "picture", "image to pdf"],
  },
  "word-to-pdf": {
    name: "Word to PDF",
    short: "Convert DOC and DOCX documents to PDF.",
    metaTitle: "Word to PDF – Convert DOCX to PDF Online",
    metaDescription:
      "Convert Word (DOC, DOCX, ODT) documents to PDF while keeping the formatting. Free, no sign-up; files are deleted after processing.",
    h1: "Word to PDF",
    lead: "Convert Word documents to PDF with their fonts, tables and images intact.",
    steps: ["Select your Word files (DOC, DOCX, ODT, RTF).", "Click “Start”.", "Download the converted PDF."],
    faq: [SERVER_FAQ],
    keywords: ["word", "docx", "doc", "office", "document"],
  },
  "excel-to-pdf": {
    name: "Excel to PDF",
    short: "Convert XLS and XLSX spreadsheets to PDF.",
    metaTitle: "Excel to PDF – Convert XLSX to PDF Online",
    metaDescription:
      "Convert Excel (XLS, XLSX, ODS, CSV) spreadsheets to PDF for free. No sign-up; files are deleted after processing.",
    h1: "Excel to PDF",
    lead: "Turn spreadsheets into PDF files that are easy to share and print.",
    steps: ["Select your Excel files.", "Click “Start”.", "Download the converted PDF."],
    faq: [SERVER_FAQ],
    keywords: ["excel", "xlsx", "xls", "spreadsheet", "csv"],
  },
  "powerpoint-to-pdf": {
    name: "PowerPoint to PDF",
    short: "Convert PPT and PPTX presentations to PDF.",
    metaTitle: "PowerPoint to PDF – Convert PPTX to PDF Online",
    metaDescription:
      "Convert PowerPoint (PPT, PPTX, ODP) presentations to PDF for free. No sign-up; files are deleted after processing.",
    h1: "PowerPoint to PDF",
    lead: "Turn presentations into PDFs that look the same on every device.",
    steps: ["Select your PowerPoint files.", "Click “Start”.", "Download the converted PDF."],
    faq: [SERVER_FAQ],
    keywords: ["powerpoint", "pptx", "ppt", "presentation", "slides"],
  },
  "pdf-to-jpg": {
    name: "PDF to JPG",
    short: "Turn PDF pages into high-quality JPG or PNG images.",
    metaTitle: "PDF to JPG – Convert PDF Pages to Images",
    metaDescription:
      "Convert PDF pages into high-resolution JPG or PNG images. Free; your file is processed in your browser without uploading.",
    h1: "PDF to JPG",
    lead: "Save every PDF page as a separate image at the resolution you choose.",
    steps: [
      "Select your PDF.",
      "Choose the image format (JPG/PNG) and quality.",
      "Click “Start” and download the images one by one or as a ZIP.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["jpg", "png", "image", "picture", "pdf to image"],
  },
  "pdf-to-word": {
    name: "PDF to Word",
    short: "Convert a PDF into an editable Word (DOCX) document.",
    metaTitle: "PDF to Word – Convert PDF to DOCX Online",
    metaDescription:
      "Convert PDF files into editable Word (DOCX) documents for free. Use the OCR tool for scanned documents.",
    h1: "PDF to Word",
    lead: "Convert your PDF into a DOCX document you can edit in Microsoft Word.",
    steps: ["Select your PDF.", "Click “Start”.", "Download the DOCX file."],
    faq: [
      {
        q: "Can I convert a scanned PDF to Word?",
        a: "Scanned documents store text as images, so they need OCR first. The Unlimited-OCR mode of the OCR tool exports to Word.",
      },
      SERVER_FAQ,
    ],
    keywords: ["word", "docx", "editable", "pdf to word", "doc"],
  },
  "pdf-to-pdfa": {
    name: "PDF to PDF/A",
    short: "Convert to the PDF/A standard for long-term archiving.",
    metaTitle: "PDF to PDF/A – Convert to Archival Format",
    metaDescription:
      "Convert PDF files to the PDF/A archival standard required by many courts and e-archive systems, for free.",
    h1: "PDF to PDF/A",
    lead: "Convert documents to PDF/A, the ISO standard for long-term archiving.",
    steps: [
      "Select your PDF.",
      "Choose the PDF/A version (recommended: PDF/A-2b).",
      "Click “Start” and download the file.",
    ],
    faq: [
      {
        q: "What is PDF/A?",
        a: "PDF/A is an ISO standard that embeds fonts and color information in the file so the document looks the same years from now.",
      },
      SERVER_FAQ,
    ],
    keywords: ["pdf/a", "pdfa", "archive", "archival"],
  },
  "page-numbers": {
    name: "Add Page Numbers",
    short: "Add page numbers to a PDF at the position you choose.",
    metaTitle: "Add Page Numbers to PDF – Free",
    metaDescription:
      "Add page numbers to your PDF in the position, font and format you want (1, 1/10, Page 1). Free; processed in your browser.",
    h1: "Add Page Numbers to PDF",
    lead: "Choose the position, format and starting number of your page numbers.",
    steps: [
      "Select your PDF.",
      "Set the position, format and starting number.",
      "Click “Start” and download the numbered PDF.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["page numbers", "numbering", "number pages"],
  },
  watermark: {
    name: "Add Watermark",
    short: "Stamp text or an image watermark on a PDF.",
    metaTitle: "Add Watermark to PDF – Text and Logo Watermarks",
    metaDescription:
      "Add a text or logo watermark to PDF pages and adjust opacity, angle and position. Free; processed in your browser.",
    h1: "Add Watermark to PDF",
    lead: "Mark your documents with text like “CONFIDENTIAL” or “DRAFT”, or with your logo.",
    steps: [
      "Select your PDF.",
      "Type the watermark text or upload an image; adjust opacity, size and angle.",
      "Click “Start” and download the watermarked PDF.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["watermark", "stamp", "logo", "confidential", "draft"],
  },
  crop: {
    name: "Crop PDF",
    short: "Trim page margins.",
    metaTitle: "Crop PDF – Trim PDF Margins Online",
    metaDescription: "Crop the edges of PDF pages with millimetre precision. Free; processed in your browser.",
    h1: "Crop PDF",
    lead: "Remove unnecessary margins or keep only part of the page.",
    steps: [
      "Select your PDF.",
      "Set how much to trim from the top, bottom, left and right.",
      "Click “Start” and download the cropped PDF.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["crop", "trim", "margins", "cut"],
  },
  sign: {
    name: "Sign PDF",
    short: "Draw, type or upload your signature and place it on a PDF.",
    metaTitle: "Sign PDF – Add a Signature to a PDF Online",
    metaDescription:
      "Draw your signature with a mouse or finger, type it or upload an image and place it on your PDF. Free; nothing is uploaded.",
    h1: "Sign PDF",
    lead: "Create your signature and drag it anywhere on the document.",
    steps: [
      "Select your PDF.",
      "Draw, type or upload your signature.",
      "Position the signature, click “Start” and download the signed PDF.",
    ],
    faq: [
      {
        q: "Is this a legally qualified electronic signature?",
        a: "No. This tool places an image of your signature on the document. Qualified electronic signatures require a certificate from an accredited provider.",
      },
      PRIVATE_FAQ,
    ],
    keywords: ["sign", "signature", "initial"],
  },
  metadata: {
    name: "Edit PDF Metadata",
    short: "Change the title, author, subject and keywords.",
    metaTitle: "Edit PDF Metadata – Change Title and Author",
    metaDescription:
      "View and edit a PDF's title, author, subject, keywords and creator fields. Free; runs in your browser.",
    h1: "Edit PDF Metadata",
    lead: "View and change the document properties of a PDF (title, author, subject, keywords).",
    steps: [
      "Select your PDF.",
      "Review and edit the current properties.",
      "Click “Start” and download the updated PDF.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["metadata", "author", "title", "properties"],
  },
  protect: {
    name: "Protect PDF",
    short: "Add an open password to a PDF.",
    metaTitle: "Protect PDF – Add a Password to a PDF",
    metaDescription:
      "Protect your PDF with a strong AES-256 open password and restrict printing and copying. Free; files are deleted after processing.",
    h1: "Protect PDF with a Password",
    lead: "Protect your PDF with AES-256 encryption so only people with the password can open it.",
    steps: [
      "Select your PDF.",
      "Enter the password twice and optionally restrict printing and copying.",
      "Click “Start” and download the encrypted PDF.",
    ],
    faq: [
      {
        q: "What if I forget my password?",
        a: "We don't store passwords and can't recover them. Keep your password somewhere safe.",
      },
      SERVER_FAQ,
    ],
    keywords: ["password", "encrypt", "protect", "lock", "secure"],
  },
  unlock: {
    name: "Unlock PDF",
    short: "Remove protection from a PDF whose password you know.",
    metaTitle: "Unlock PDF – Remove a PDF Password",
    metaDescription:
      "Remove the open password and restrictions from a PDF whose password you know. Free; files are deleted after processing.",
    h1: "Remove PDF Password",
    lead: "Remove protection from a PDF you know the password for, so you don't have to type it every time.",
    steps: ["Select your PDF.", "Enter the current password.", "Click “Start” and download the unlocked PDF."],
    faq: [
      {
        q: "Can I open a PDF whose password I don't know?",
        a: "No. This tool is only for files whose password you know; it does not crack passwords.",
      },
      SERVER_FAQ,
    ],
    keywords: ["unlock", "remove password", "decrypt"],
  },
};
