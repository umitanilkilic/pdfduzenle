"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-brand text-brand-fg hover:bg-brand-hover shadow-sm",
        variant === "secondary" && "border-border bg-surface hover:bg-surface-2 border",
        variant === "ghost" && "text-muted hover:bg-surface-2 hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({
  label,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "text-muted hover:bg-surface-2 hover:text-fg grid size-8 place-items-center rounded-full transition disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{label}</p>
      {children}
      {hint && <p className="text-muted text-xs">{hint}</p>}
    </div>
  );
}

/** Radio group styled as a segmented control / list of cards. */
export function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
  columns = 1,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3;
}) {
  const name = useId();
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className={cn("grid gap-2", columns === 2 && "grid-cols-2", columns === 3 && "grid-cols-3")}>
        {options.map((o) => (
          <label
            key={String(o.value)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition",
              value === o.value
                ? "border-brand bg-brand-soft font-medium"
                : "border-border bg-surface hover:bg-surface-2",
            )}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function TextInput({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        className="border-border bg-surface focus:border-brand focus:ring-brand/15 h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-4"
        {...props}
      />
      {hint && <p className="text-muted text-xs">{hint}</p>}
    </div>
  );
}

export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <TextInput
      label={label}
      type="number"
      inputMode="decimal"
      value={Number.isFinite(value) ? value : ""}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.valueAsNumber)}
    />
  );
}

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = String,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <label htmlFor={id} className="font-semibold">
          {label}
        </label>
        <span className="text-muted tabular-nums">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        className="w-full accent-[var(--brand)]"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.valueAsNumber)}
      />
    </div>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--brand)]"
      />
      {label}
    </label>
  );
}
