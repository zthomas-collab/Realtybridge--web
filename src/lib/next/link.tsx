import { useRouter } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, MouseEvent } from "react";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean; scroll?: boolean; replace?: boolean };

/** Drop-in for the original app's Link: client-side navigation by href string. */
export default function Link({ href, prefetch: _p, scroll: _s, replace, onClick, ...rest }: Props) {
  const router = useRouter();
  function handle(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || rest.target === "_blank" || /^(https?:|mailto:|tel:)/.test(href)) return;
    e.preventDefault();
    void router.navigate({ href, replace });
  }
  return <a href={href} onClick={handle} {...rest} />;
}
