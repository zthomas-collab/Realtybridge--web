import { useSyncExternalStore } from "react";
import type { Profile, UserRole } from "@/lib/types";

/** Admin-only "view the app as" switch. Purely visual: the database still treats the user as admin. */
export type PreviewRole = Exclude<UserRole, "admin">;
const KEY = "rb-admin-preview-role";
const listeners = new Set<() => void>();

export function getPreviewRole(): PreviewRole | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(KEY);
  return v === "investor" || v === "realtor" || v === "contractor" ? v : null;
}

export function setPreviewRole(role: PreviewRole | null) {
  if (role) window.localStorage.setItem(KEY, role);
  else window.localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}

export function usePreviewRole() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    getPreviewRole,
    () => null,
  );
}

/** Applies the preview only to real admins. */
export function applyPreview(me: Profile, preview: PreviewRole | null): Profile & { previewing?: boolean } {
  return me.role === "admin" && preview ? { ...me, role: preview, previewing: true } : me;
}
