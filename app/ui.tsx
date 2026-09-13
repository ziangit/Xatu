"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "./i18n/provider";

/**
 * Small shared UI pieces.
 *
 * `window.confirm` / `alert` are banned in this app: the browser's native
 * dialog is unstyleable, jarring, and says "localhost:7317 says". Destructive
 * actions confirm **in place** instead — the row turns into its own question.
 */

/**
 * Copy to the clipboard and say so, in the button itself.
 *
 * Every copy affordance in the app uses this — a copy is invisible otherwise,
 * and one button confirming while another stays silent reads as the silent one
 * being broken. `label(copied)` keeps each button's own wording ("Copy JSON" vs
 * "copy JSON (3)") while the timing and the failure path stay shared.
 */
export function useCopy(ms = 1500) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return false; // denied permission / insecure context — say nothing false
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), ms);
    return true;
  };

  return { copied, copy };
}

export function InlineConfirm({
  question,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  question: string;
  /** Defaults to a translated "Delete"; callers pass their own verb. */
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span className="text-[11px] text-stone-500">{question}</span>
      <button
        onClick={onConfirm}
        disabled={busy}
        autoFocus
        className="rounded bg-[#e5484d] px-2 py-0.5 text-[11px] font-semibold text-white hover:opacity-85 disabled:opacity-40"
      >
        {confirmLabel ?? t("Delete")}
      </button>
      <button
        onClick={onCancel}
        className="text-[11px] text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
      >
        {t("cancel")}
      </button>
    </span>
  );
}

/**
 * Rename in place: the name becomes the input, Enter commits, Escape reverts.
 *
 * Same rule as `InlineConfirm` — no native `prompt()`, for exactly the reasons
 * in this file's header. Blur commits too, because a click elsewhere after
 * typing a name reads as "done", not "discard"; Escape is the way out and it
 * restores the original text rather than leaving a half-edit behind.
 *
 * The caller owns the value and decides what an empty or unchanged name means
 * (`renameTeam` treats both as a no-op), so this component only reports what
 * was typed.
 */
export function InlineRename({
  value,
  label,
  onRename,
  onCancel,
  className = "",
}: {
  value: string;
  /** Accessible name for the field — the caller knows whose name this is. */
  label: string;
  onRename: (next: string) => void;
  onCancel: () => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <input
      autoFocus
      value={draft}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onRename(draft);
        } else if (e.key === "Escape") {
          e.preventDefault();
          setDraft(value);
          onCancel();
        }
      }}
      onBlur={() => onRename(draft)}
      className={`min-w-0 rounded border border-stone-400 bg-white px-1.5 py-0.5 text-xs text-stone-800 focus:border-stone-600 focus:outline-none ${className}`}
    />
  );
}
