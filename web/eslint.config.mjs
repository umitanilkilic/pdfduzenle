import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // pdf-lib and the PDF operations run in the Web Worker. Main-thread code may only import their types,
    // otherwise pdf-lib (~400 KB) ends up in the page bundles and route prefetches.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/pdf/**", "src/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "pdf-lib",
                "@pdf-lib/*",
                "@/pdf/ops/*",
                "@/pdf/load",
                "@/pdf/embed",
                "@/pdf/engine",
                "@/pdf/worker",
              ],
              allowTypeImports: true,
              message: "Runs in the PDF worker: import types only, or go through the PdfEngine.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
