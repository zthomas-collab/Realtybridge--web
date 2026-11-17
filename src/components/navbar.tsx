
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Bell,
  Briefcase,
  ChevronDown,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  MapPin,
  Plus,
  RotateCcw,
  Settings,
  Shield,
  Signpost,
  Star,
  User,
} from "lucide-react";
import Link from "@/lib/next/link";
import { usePathname, useRouter } from "@/lib/next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { keys, useMe } from "@/lib/hooks";
import type { Profile, UserRole } from "@/lib/types";
import { cn, fullName, timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui";
import { Logo } from "./logo";
import { setPreviewRole } from "@/lib/preview-role";
import { TRIAL_DAYS } from "@/lib/domain/paywall";

const NAV: Record<UserRole, { href: string; label: string; icon: React.ReactNode; primary?: boolean }[]> = {
  investor: [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
    { href: "/deals/new", label: "Post a Deal", icon: <Plus />, primary: true },
    { href: "/deals", label: "My Deals", icon: <Briefcase /> },
    { href: "/listings", label: "Listings in My Area", icon: <Signpost /> },
  ],
  realtor: [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
    { href: "/realtor-network", label: "Referral Network", icon: <Signpost /> },
    { href: "/browse", label: "Properties in My Area", icon: <MapPin /> },
    { href: "/deals", label: "My Deals", icon: <Briefcase /> },
    { href: "/listings", label: "My Listings", icon: <Signpost /> },
  ],
  contractor: [{ href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard /> }],
  admin: [
    { href: "/admin", label: "Moderation", icon: <Shield /> },
    { href: "/network-admin", label: "Realtor Network", icon: <Signpost /> },
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
  ],
};

function isActive(pathname: string, href: string) {
  if (href === "/deals") return pathname === "/deals" || (pathname.startsWith("/deals/") && pathname !== "/deals/new");
  return pathname === href || pathname.startsWith(href + "/");
}

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onOutside();
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onOutside]);
  return ref;
}

export function Navbar({ restricted = false }: { restricted?: boolean }) {
  const pathname = usePathname();
  const { data: me } = useMe();
  const items = restricted ? [] : me ? NAV[me.role] : [];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {items.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          {me && !restricted && <NotificationsBell />}
          {me && <UserMenu me={me} restricted={restricted} />}
        </div>
      </div>
      {/* mobile nav */}
      <nav aria-label="Main" className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
        {items.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>
      {me && (me as { previewing?: boolean }).previewing && (
        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <span>Admin preview: you're seeing the app as a <b>{me.role}</b>. Saving and posting still act as your admin account.</span>
          <button onClick={() => setPreviewRole(null)} className="font-medium underline">Exit preview</button>
        </div>
      )}
    </header>
  );
}

function NavLink({ item, active }: { item: (typeof NAV)["investor"][number]; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors [&_svg]:size-4",
        item.primary
          ? active
            ? "bg-brand-700 text-white"
            : "bg-brand-600 text-white hover:bg-brand-700"
          : active
            ? "bg-brand-50 text-brand-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-ink",
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const qc = useQueryClient();
  const router = useRouter();
  const { data = [] } = useQuery({ queryKey: keys.notifications, queryFn: api.notifications });
  const unread = data.filter((n) => !n.read_at).length;

  useEffect(() => api.subscribeNotifications(() => qc.invalidateQueries({ queryKey: keys.notifications })), [qc]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next && unread) {
      await api.markNotificationsRead();
      qc.invalidateQueries({ queryKey: keys.notifications });
    }
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open} className="relative flex size-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius-card)] border border-border bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && <span className="text-xs text-muted">{unread} new</span>}
          </div>
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {data.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">You&apos;re all caught up</li>}
            {data.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => {
                    if (n.link) router.push(n.link);
                    void toggle();
                  }}
                  className="flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-brand-600")} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{n.title}</span>
                    {n.body && <span className="block truncate text-sm text-muted">{n.body}</span>}
                    <span className="mt-0.5 block text-xs text-slate-400">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const MEMBER_ROLES = [
  ["investor", "Investor", "Free"],
  ["realtor", "Realtor", "$25/mo total"],
  ["contractor", "Contractor", "$6/mo, or included with Realtor"],
] as const;

/** Lets a member hop between the investor / realtor / contractor profiles on their one account, or add another. */
function ProfileSwitcher({ me, onDone }: { me: Profile; onDone: () => void }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const mine = me.roles?.length ? me.roles : [me.role];
  async function pick(role: (typeof MEMBER_ROLES)[number][0], has: boolean) {
    if (role === me.role) return onDone();
    if (!has && !window.confirm(`Add a ${role} profile to your account?${role === "investor" ? "" : role === "realtor" ? " Realtor profiles are free with deal previews; RealtyBridge Pro ($25/month or $275/year) unlocks full details and contact info." : ` Contractor profiles need an active subscription or trial. Your ${TRIAL_DAYS}-day free trial begins only when you subscribe and complete checkout in Settings & Billing.`}`)) return;
    setBusy(role);
    try {
      await (has ? api.switchRole(role) : api.addRole(role));
      await qc.invalidateQueries();
      onDone();
      router.push(has ? "/dashboard" : "/profile");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Couldn't switch profiles");
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="mt-1 border-t border-border pt-1">
      <p className="px-4 pt-2 pb-1 text-xs font-medium tracking-wide text-muted uppercase">Switch profile</p>
      {MEMBER_ROLES.map(([r, label, price]) => {
        const has = mine.includes(r);
        return (
          <button key={r} role="menuitem" disabled={busy !== null} onClick={() => pick(r, has)}
            className={cn("flex w-full items-center justify-between gap-2 px-4 py-1.5 text-left text-sm hover:bg-slate-50 disabled:opacity-60", me.role === r ? "font-medium text-brand-700" : "text-slate-700")}>
            <span>{has ? label : <>+ Add {label} <span className="text-xs text-muted">({price})</span></>}</span>
            {busy === r ? <span className="text-xs text-muted">…</span> : me.role === r && <span className="size-1.5 rounded-full bg-brand-600" />}
          </button>
        );
      })}
    </div>
  );
}

function UserMenu({ me, restricted = false }: { me: Profile; restricted?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const qc = useQueryClient();
  const router = useRouter();

  const links = restricted ? [
    { href: "/settings", label: "Settings & Billing", icon: <Settings /> },
  ] : [
    { href: "/profile", label: me.role === "realtor" ? "Profile & License" : "Profile", icon: <User /> },
    ...(me.role !== "contractor" ? [{ href: "/reviews", label: "My Reviews", icon: <Star /> }] : []),
    ...(me.role === "investor" ? [{ href: "/blocked", label: "Blocked Realtors", icon: <Ban /> }] : []),
    { href: "/settings", label: "Settings & Billing", icon: <Settings /> },
  ];

  function switchPersona(role: UserRole) {
    api.demo?.switchPersona(role);
    qc.clear();
    setOpen(false);
    router.push(role === "admin" ? "/admin" : "/dashboard");
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-2 rounded-lg py-1 pr-2 pl-1 hover:bg-slate-100">
        <Avatar person={me} size={32} />
        <span className="hidden text-left sm:block">
          <span className="block text-sm leading-tight font-medium text-ink">{fullName(me)}</span>
          <span className="block text-xs leading-tight text-muted capitalize">{me.role}</span>
        </span>
        <ChevronDown className="size-4 text-slate-400" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 overflow-hidden rounded-[var(--radius-card)] border border-border bg-white py-1 shadow-xl">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium">{fullName(me)}</p>
            <p className="truncate text-xs text-muted">{me.email}</p>
          </div>
          {links.map((l) => (
            <Link key={l.href} href={l.href} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 [&_svg]:size-4 [&_svg]:text-slate-400">
              {l.icon}
              {l.label}
            </Link>
          ))}
          {api.demo && (
            <div className="mt-1 border-t border-border pt-1">
              <p className="flex items-center gap-1.5 px-4 pt-2 pb-1 text-xs font-medium tracking-wide text-muted uppercase">
                <FlaskConical className="size-3" /> Demo: view as
              </p>
              {(["investor", "realtor", "admin"] as const).map((r) => (
                <button key={r} role="menuitem" onClick={() => switchPersona(r)} className={cn("flex w-full items-center justify-between px-4 py-1.5 text-sm capitalize hover:bg-slate-50", me.role === r ? "font-medium text-brand-700" : "text-slate-700")}>
                  {r}
                  {me.role === r && <span className="size-1.5 rounded-full bg-brand-600" />}
                </button>
              ))}
              <button
                role="menuitem"
                onClick={() => {
                  api.demo?.reset();
                  qc.clear();
                  setOpen(false);
                  router.push("/dashboard");
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="size-4 text-slate-400" /> Reset demo data
              </button>
            </div>
          )}
          {!restricted && me.role !== "admin" && !(me as { previewing?: boolean }).previewing && <ProfileSwitcher me={me} onDone={() => setOpen(false)} />}
          {(me.role === "admin" || (me as { previewing?: boolean }).previewing) && (
            <div className="mt-1 border-t border-border pt-1">
              <p className="flex items-center gap-1.5 px-4 pt-2 pb-1 text-xs font-medium tracking-wide text-muted uppercase">
                <FlaskConical className="size-3" /> Preview as
              </p>
              {(["investor", "realtor", "contractor", null] as const).map((r) => {
                const current = (me as { previewing?: boolean }).previewing ? me.role : null;
                return (
                  <button key={r ?? "admin"} role="menuitem" onClick={() => { setPreviewRole(r); setOpen(false); router.push(r ? "/dashboard" : "/admin"); }}
                    className={cn("flex w-full items-center justify-between px-4 py-1.5 text-sm hover:bg-slate-50", current === r ? "font-medium text-brand-700" : "text-slate-700")}>
                    {r ? r[0].toUpperCase() + r.slice(1) : "Admin (back to normal)"}
                    {current === r && <span className="size-1.5 rounded-full bg-brand-600" />}
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-1 border-t border-border pt-1">
            <button
              role="menuitem"
              onClick={async () => {
                await api.signOut();
                qc.clear();
                router.push("/login");
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="size-4 text-slate-400" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
