"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { LogOut, Menu, Moon, Search, Sun } from "lucide-react";
import { Button, Input, Kbd } from "@/components/ui/primitives";
import { initials } from "@/lib/format";
import { ROLE_LABEL, type Role } from "@/lib/roles";

export function Topbar({
  user,
  onOpenNav,
}: {
  user: { name: string; email: string; role: Role };
  onOpenNav: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/clients?search=${encodeURIComponent(query.trim())}` : "/clients");
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur lg:px-6">
      <button
        onClick={onOpenNav}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      <form onSubmit={submit} className="relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
        <Input
          id="global-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients by name or city"
          className="pl-9 pr-14"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <Kbd>⌘K</Kbd>
        </span>
      </form>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-muted"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-brand-foreground">
              {initials(user.name)}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-medium leading-tight text-foreground">{user.name}</span>
              <span className="block text-[11px] leading-tight text-muted-foreground">
                {ROLE_LABEL[user.role]}
              </span>
            </span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-border bg-popover p-1.5 shadow-pop">
                <div className="px-2.5 py-2">
                  <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="my-1 h-px bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={signOut}
                >
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="size-9" />;

  const dark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </Button>
  );
}
