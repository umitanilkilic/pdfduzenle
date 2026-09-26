import { Upload } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import type { ToolId } from "@/tools/registry";

export function ToolWorkspace({ locale }: { locale: Locale; toolId: ToolId }) {
  const dict = getDictionary(locale);
  return (
    <div className="border-border bg-surface grid min-h-64 place-items-center rounded-3xl border-2 border-dashed p-10 text-center">
      <div>
        <Upload className="text-muted mx-auto size-10" aria-hidden />
        <p className="text-muted mt-4">{dict.tool.comingSoon}</p>
      </div>
    </div>
  );
}
