"use client";

import { useRuntime } from "@/components/tool/runtime";
import { Checkbox, TextInput } from "@/components/tool/ui";
import { createServerTool } from "./server";
import type { ToolViewProps } from "./types";

export interface ProtectOptions {
  password: string;
  confirm: string;
  allowPrint: boolean;
  allowCopy: boolean;
}

function Options({ options, setOptions }: ToolViewProps<ProtectOptions>) {
  const { dict } = useRuntime();
  const t = dict.toolUi.protect;
  return (
    <>
      <TextInput
        label={t.password}
        type="password"
        autoComplete="new-password"
        value={options.password}
        onChange={(e) => setOptions({ password: e.target.value })}
      />
      <TextInput
        label={t.confirm}
        type="password"
        autoComplete="new-password"
        value={options.confirm}
        onChange={(e) => setOptions({ confirm: e.target.value })}
      />
      <Checkbox
        label={t.allowPrint}
        checked={options.allowPrint}
        onChange={(allowPrint) => setOptions({ allowPrint })}
      />
      <Checkbox label={t.allowCopy} checked={options.allowCopy} onChange={(allowCopy) => setOptions({ allowCopy })} />
    </>
  );
}

export function validateProtect(o: ProtectOptions) {
  if (!o.password) return "emptySelection" as const;
  if (o.password !== o.confirm) return "passwordMismatch" as const;
  return null;
}

export default createServerTool<ProtectOptions>({
  id: "protect",
  initialOptions: () => ({ password: "", confirm: "", allowPrint: true, allowCopy: true }),
  Options,
  validate: validateProtect,
  fields: (o) => ({ password: o.password, allowPrint: String(o.allowPrint), allowCopy: String(o.allowCopy) }),
  suffix: ({ dict }) => dict.toolUi.protect.output,
});
