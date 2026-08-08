"use client";

/**
 * Small shared UI pieces.
 *
 * `window.confirm` / `alert` are banned in this app: the browser's native
 * dialog is unstyleable, jarring, and says "localhost:7317 says". Destructive
 * actions confirm **in place** instead — the row turns into its own question.
 */

export function InlineConfirm({
  question,
  confirmLabel = "Delete",
  busy = false,
  onConfirm,
  onCancel,
}: {
  question: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span className="text-[11px] text-stone-500">{question}</span>
      <button
        onClick={onConfirm}
        disabled={busy}
        autoFocus
        className="rounded bg-[#e5484d] px-2 py-0.5 text-[11px] font-semibold text-white hover:opacity-85 disabled:opacity-40"
      >
        {confirmLabel}
      </button>
      <button
        onClick={onCancel}
        className="text-[11px] text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
      >
        cancel
      </button>
    </span>
  );
}
