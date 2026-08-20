"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { Role } from "@/lib/roles";

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: Role };
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar role={user.role} open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="lg:pl-60">
        <Topbar user={user} onOpenNav={() => setNavOpen(true)} />
        <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
