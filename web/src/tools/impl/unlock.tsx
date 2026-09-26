"use client";

import { useRuntime } from "@/components/tool/runtime";
import { TextInput } from "@/components/tool/ui";
import { createServerTool } from "./shared/server";
import type { ToolViewProps } from "./shared/types";

export interface UnlockOptions {
  password: string;
}

function Options({ options, setOptions }: ToolViewProps<UnlockOptions>) {
  const { dict } = useRuntime();
  return (
    <TextInput
      label={dict.toolUi.unlock.password}
      type="password"
      autoComplete="current-password"
      value={options.password}
      onChange={(e) => setOptions({ password: e.target.value })}
    />
  );
}

export default createServerTool<UnlockOptions>({
  id: "unlock",
  initialOptions: () => ({ password: "" }),
  Options,
  fields: (o) => ({ password: o.password }),
  suffix: ({ dict }) => dict.toolUi.unlock.output,
});
