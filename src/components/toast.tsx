
import { CheckCircle2, XCircle } from "lucide-react";
import { create } from "zustand";
import { cn } from "@/lib/utils";

interface Toast {
  id: number;
  tone: "success" | "error";
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  push: (tone: Toast["tone"], message: string) => void;
  dismiss: (id: number) => void;
}

let next = 1;

export const useToasts = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (tone, message) => {
    const id = next++;
    set({ toasts: [...get().toasts, { id, tone, message }] });
    setTimeout(() => get().dismiss(id), 4500);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  success: (m: string) => useToasts.getState().push("success", m),
  error: (m: string) => useToasts.getState().push("error", m),
};

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-card)] border bg-white px-4 py-3 text-left text-sm shadow-lg",
            t.tone === "success" ? "border-emerald-200" : "border-red-200",
          )}
        >
          {t.tone === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-red-600" />}
          <span className="text-ink">{t.message}</span>
        </button>
      ))}
    </div>
  );
}
