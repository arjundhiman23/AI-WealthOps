"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  FileText,
  LayoutDashboard,
  ListChecks,
  Settings,
  Shield,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/roles";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
};

const PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/opportunities", label: "Opportunities", icon: Sparkles },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/assistant", label: "Assistant", icon: Bot },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const SECONDARY: NavItem[] = [
  { href: "/admin", label: "Admin", icon: Shield, roles: ["admin", "operations"] },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-active-bg text-white"
          : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-white",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-active-bar" />
      )}
      <item.icon
        className={cn(
          "size-[17px] shrink-0",
          active ? "text-sidebar-active-bar" : "text-sidebar-muted group-hover:text-white",
        )}
      />
      {item.label}
    </Link>
  );
}

export function Sidebar({
  role,
  open,
  onClose,
}: {
  role: Role;
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const visible = (item: NavItem) => !item.roles || item.roles.includes(role);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-active-bg text-sidebar-active-bar">
              <Sparkles className="size-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">WealthOps AI</span>
              <span className="block truncate text-[11px] text-sidebar-muted">Vijay WealthDesk</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-sidebar-muted hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="scrollbar-none flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {PRIMARY.filter(visible).map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={onClose} />
          ))}

          <div className="my-3 h-px bg-sidebar-border" />

          {SECONDARY.filter(visible).map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={onClose} />
          ))}
        </nav>

        <div className="border-t border-sidebar-border px-4 py-3">
          <p className="flex items-center gap-1.5 text-[11px] text-sidebar-muted">
            <span className="size-1.5 animate-pulse-ring rounded-full bg-success" />
            Demo environment · synthetic data
          </p>
        </div>
      </aside>
    </>
  );
}
