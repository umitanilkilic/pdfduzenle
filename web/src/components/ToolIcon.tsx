import {
  Combine,
  Crop,
  Droplets,
  FileArchive,
  FileImage,
  FileMinus,
  FileOutput,
  FileText,
  Hash,
  Image,
  Info,
  LayoutGrid,
  Lock,
  LockOpen,
  Minimize2,
  Presentation,
  RotateCw,
  ScanText,
  Scissors,
  Sheet,
  Signature,
  Wrench,
  type LucideProps,
} from "lucide-react";
import type { ToolIcon as ToolIconName } from "@/tools/registry";

const icons = {
  Combine,
  Crop,
  Droplets,
  FileArchive,
  FileImage,
  FileMinus,
  FileOutput,
  FileText,
  Hash,
  Image,
  Info,
  LayoutGrid,
  Lock,
  LockOpen,
  Minimize2,
  Presentation,
  RotateCw,
  ScanText,
  Scissors,
  Sheet,
  Signature,
  Wrench,
} satisfies Record<ToolIconName, unknown>;

export function ToolIcon({ name, ...props }: { name: ToolIconName } & LucideProps) {
  const Icon = icons[name];
  return <Icon aria-hidden {...props} />;
}
