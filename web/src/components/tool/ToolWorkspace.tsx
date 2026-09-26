import { Upload } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { hasToolImpl } from "@/tools/impl";
import { getToolContent } from "@/tools/content";
import { toolPath } from "@/tools/paths";
import { getTool, type ToolId } from "@/tools/registry";
import { ToolRunner } from "./ToolRunner";
import { ToolRuntimeProvider } from "./runtime";
import type { NextTool } from "./types";

export function ToolWorkspace({ locale, toolId }: { locale: Locale; toolId: ToolId }) {
  const dict = getDictionary(locale);
  const tool = getTool(toolId);

  if (!hasToolImpl(toolId)) {
    return (
      <div className="border-border bg-surface grid min-h-64 place-items-center rounded-3xl border-2 border-dashed p-10 text-center">
        <div>
          <Upload className="text-muted mx-auto size-10" aria-hidden />
          <p className="text-muted mt-4">{dict.tool.comingSoon}</p>
        </div>
      </div>
    );
  }

  const next: NextTool[] = tool.next.map((id) => {
    const t = getTool(id);
    return {
      href: toolPath(locale, t),
      name: getToolContent(locale, id).name,
      icon: t.icon,
      category: t.category,
      accept: t.accept,
    };
  });

  return (
    <ToolRuntimeProvider dict={dict} locale={locale}>
      <ToolRunner
        toolId={toolId}
        accept={tool.accept}
        multiple={tool.multiple}
        zipName={`${tool.slug[locale]}.zip`}
        next={next}
      />
    </ToolRuntimeProvider>
  );
}
