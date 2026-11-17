import { useLocation, useRouter as useTsRouter } from "@tanstack/react-router";
import { useMemo } from "react";

export function useRouter() {
  const router = useTsRouter();
  return useMemo(
    () => ({
      push: (href: string) => void router.navigate({ href }),
      replace: (href: string) => void router.navigate({ href, replace: true }),
      back: () => router.history.back(),
      refresh: () => void router.invalidate(),
    }),
    [router],
  );
}

export function usePathname() {
  return useLocation({ select: (l) => l.pathname });
}

export function useSearchParams() {
  const search = useLocation({ select: (l) => l.searchStr });
  return useMemo(() => new URLSearchParams(search), [search]);
}
