
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/components/toast";
import { errorMessage } from "@/lib/utils";
import { applyPreview, usePreviewRole } from "@/lib/preview-role";

export const keys = {
  me: ["me"] as const,
  metrics: ["metrics"] as const,
  myDeals: ["deals", "mine"] as const,
  deal: (id: string) => ["deals", id] as const,
  browse: (filters: object = {}) => ["deals", "browse", filters] as const,
  myInterests: ["deals", "interests"] as const,
  reviewsAbout: (id: string) => ["reviews", "about", id] as const,
  reviewsWritten: ["reviews", "written"] as const,
  pendingReviews: ["reviews", "pending"] as const,
  blocked: ["blocked"] as const,
  agents: (state: string) => ["agents", state] as const,
  member: (id: string) => ["member", id] as const,
  notifications: ["notifications"] as const,
  admin: ["admin"] as const,
  listings: ["listings"] as const,
  community: ["community"] as const,
};

export function useMe() {
  const preview = usePreviewRole();
  return useQuery({ queryKey: keys.me, queryFn: api.me, select: (me) => applyPreview(me, preview) });
}

/** The signed-in profile without any admin preview applied. */
export function useRealMe() {
  return useQuery({ queryKey: keys.me, queryFn: api.me });
}

/**
 * Mutation that toasts on success/error and refreshes everything that could be affected.
 * The data set is small, so invalidating broadly keeps every widget consistent.
 */
export function useAction<TArgs, TResult = unknown>(fn: (args: TArgs) => Promise<TResult>, opts: { success?: string | ((r: TResult) => string); invalidate?: QueryKey[] } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (r) => {
      if (opts.invalidate) await Promise.all(opts.invalidate.map((k) => qc.invalidateQueries({ queryKey: k })));
      else await qc.invalidateQueries();
      if (opts.success) toast.success(typeof opts.success === "function" ? opts.success(r) : opts.success);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
