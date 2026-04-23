"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import {
  DEFAULT_CODE_FONT_SIZE,
  DEFAULT_UI_FONT_SIZE,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  useTypographyStore,
} from "@multica/core/appearance";
import { useTheme } from "@multica/ui/components/common/theme-provider";
import { Input } from "@multica/ui/components/ui/input";
import { Switch } from "@multica/ui/components/ui/switch";
import { cn } from "@multica/ui/lib/utils";

const LIGHT_COLORS = {
  titleBar: "#e8e8e8",
  content: "#ffffff",
  sidebar: "#f4f4f5",
  bar: "#e4e4e7",
  barMuted: "#d4d4d8",
};

const DARK_COLORS = {
  titleBar: "#333338",
  content: "#27272a",
  sidebar: "#1e1e21",
  bar: "#3f3f46",
  barMuted: "#52525b",
};

function WindowMockup({
  variant,
  className,
}: {
  variant: "light" | "dark";
  className?: string;
}) {
  const colors = variant === "light" ? LIGHT_COLORS : DARK_COLORS;

  return (
    <div className={cn("flex h-full w-full flex-col", className)}>
      <div
        className="flex items-center gap-[3px] px-2 py-1.5"
        style={{ backgroundColor: colors.titleBar }}
      >
        <span className="size-[6px] rounded-full bg-[#ff5f57]" />
        <span className="size-[6px] rounded-full bg-[#febc2e]" />
        <span className="size-[6px] rounded-full bg-[#28c840]" />
      </div>
      <div
        className="flex flex-1"
        style={{ backgroundColor: colors.content }}
      >
        <div
          className="w-[30%] space-y-1 p-2"
          style={{ backgroundColor: colors.sidebar }}
        >
          <div
            className="h-1 w-3/4 rounded-full"
            style={{ backgroundColor: colors.bar }}
          />
          <div
            className="h-1 w-1/2 rounded-full"
            style={{ backgroundColor: colors.bar }}
          />
        </div>
        <div className="flex-1 space-y-1.5 p-2">
          <div
            className="h-1.5 w-4/5 rounded-full"
            style={{ backgroundColor: colors.bar }}
          />
          <div
            className="h-1 w-full rounded-full"
            style={{ backgroundColor: colors.barMuted }}
          />
          <div
            className="h-1 w-3/5 rounded-full"
            style={{ backgroundColor: colors.barMuted }}
          />
        </div>
      </div>
    </div>
  );
}

const themeOptions = [
  { value: "light" as const, label: "Light" },
  { value: "dark" as const, label: "Dark" },
  { value: "system" as const, label: "System" },
];

function SettingRow({
  label,
  description,
  control,
}: {
  label: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <div className="flex shrink-0 items-center">{control}</div>
    </div>
  );
}

function FontSizeControl({
  value,
  defaultValue,
  onChange,
  onReset,
  ariaLabel,
}: {
  value: number;
  defaultValue: number;
  onChange: (next: number) => void;
  onReset: () => void;
  ariaLabel: string;
}) {
  const isDefault = value === defaultValue;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onReset}
        disabled={isDefault}
        aria-label={`Reset ${ariaLabel}`}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <RotateCcw className="size-3.5" />
      </button>
      <div className="flex h-8 items-center rounded-lg border border-input">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={value <= MIN_FONT_SIZE}
          aria-label={`Decrease ${ariaLabel}`}
          className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <Minus className="size-3.5" />
        </button>
        <span
          aria-label={ariaLabel}
          className="min-w-8 text-center text-sm tabular-nums"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={value >= MAX_FONT_SIZE}
          aria-label={`Increase ${ariaLabel}`}
          className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const uiFontSize = useTypographyStore((s) => s.uiFontSize);
  const codeFontSize = useTypographyStore((s) => s.codeFontSize);
  const uiFontFamily = useTypographyStore((s) => s.uiFontFamily);
  const codeFontFamily = useTypographyStore((s) => s.codeFontFamily);
  const fontSmoothing = useTypographyStore((s) => s.fontSmoothing);
  const setUiFontSize = useTypographyStore((s) => s.setUiFontSize);
  const setCodeFontSize = useTypographyStore((s) => s.setCodeFontSize);
  const setUiFontFamily = useTypographyStore((s) => s.setUiFontFamily);
  const setCodeFontFamily = useTypographyStore((s) => s.setCodeFontFamily);
  const setFontSmoothing = useTypographyStore((s) => s.setFontSmoothing);
  const resetUiFontSize = useTypographyStore((s) => s.resetUiFontSize);
  const resetCodeFontSize = useTypographyStore((s) => s.resetCodeFontSize);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Theme</h2>
        <div className="flex gap-6" role="radiogroup" aria-label="Theme">
          {themeOptions.map((opt) => {
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                role="radio"
                aria-checked={active}
                aria-label={`Select ${opt.label} theme`}
                onClick={() => setTheme(opt.value)}
                className="group flex flex-col items-center gap-2"
              >
                <div
                  className={cn(
                    "aspect-[4/3] w-36 overflow-hidden rounded-lg ring-1 transition-all",
                    active
                      ? "ring-2 ring-brand"
                      : "ring-border hover:ring-2 hover:ring-border"
                  )}
                >
                  {opt.value === "system" ? (
                    <div className="relative h-full w-full">
                      <WindowMockup
                        variant="light"
                        className="absolute inset-0"
                      />
                      <WindowMockup
                        variant="dark"
                        className="absolute inset-0 [clip-path:inset(0_0_0_50%)]"
                      />
                    </div>
                  ) : (
                    <WindowMockup variant={opt.value} />
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm transition-colors",
                    active
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Typography</h2>
        <div className="divide-y divide-border rounded-lg border border-border bg-card px-4">
          <SettingRow
            label="UI Font Size"
            description="Font size for the Multica user interface"
            control={
              <FontSizeControl
                value={uiFontSize}
                defaultValue={DEFAULT_UI_FONT_SIZE}
                onChange={setUiFontSize}
                onReset={resetUiFontSize}
                ariaLabel="UI font size"
              />
            }
          />
          <SettingRow
            label="Code Font Size"
            description="Font size for code editors and diffs"
            control={
              <FontSizeControl
                value={codeFontSize}
                defaultValue={DEFAULT_CODE_FONT_SIZE}
                onChange={setCodeFontSize}
                onReset={resetCodeFontSize}
                ariaLabel="Code font size"
              />
            }
          />
          <SettingRow
            label="UI Font Family"
            description="Override the Multica user interface typeface"
            control={
              <Input
                aria-label="UI font family"
                placeholder="System font"
                value={uiFontFamily}
                onChange={(e) => setUiFontFamily(e.target.value)}
                className="h-8 w-56"
              />
            }
          />
          <SettingRow
            label="Code Font Family"
            description="Override the font for code editors and diffs"
            control={
              <Input
                aria-label="Code font family"
                placeholder="System monospace"
                value={codeFontFamily}
                onChange={(e) => setCodeFontFamily(e.target.value)}
                className="h-8 w-56"
              />
            }
          />
          <SettingRow
            label="Font Smoothing"
            description="Use native macOS font anti-aliasing"
            control={
              <Switch
                aria-label="Font smoothing"
                checked={fontSmoothing}
                onCheckedChange={setFontSmoothing}
              />
            }
          />
        </div>
      </section>
    </div>
  );
}
