"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Receipt,
  Sparkles,
  Menu,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { ThemePicker } from "@/components/layout/ThemePicker";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/categories", label: "Categories", icon: FolderOpen },
  { href: "/insights", label: "Insights", icon: Sparkles },
] as const;

function SignOutButton({ onSignedOut }: { onSignedOut?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    onSignedOut?.();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="w-full justify-start gap-3 px-3 text-muted-foreground hover:text-foreground"
      onClick={handleSignOut}
      disabled={loading}
    >
      <LogOut className="size-4 shrink-0" />
      Sign out
    </Button>
  );
}

function prefetchRoute(queryClient: ReturnType<typeof useQueryClient>, href: string) {
  switch (href) {
    case "/":
      void queryClient.prefetchQuery({
        queryKey: ["overview"],
        queryFn: () => fetch("/api/overview").then((r) => r.json()),
      });
      break;
    case "/categories":
      void queryClient.prefetchQuery({
        queryKey: ["categories"],
        queryFn: () =>
          fetch("/api/categories")
            .then((r) => r.json())
            .then((d: { categories: unknown[] }) => d.categories),
      });
      break;
    case "/transactions":
      // Preload categories (needed for filter dropdowns) and the first page
      void queryClient.prefetchQuery({
        queryKey: ["categories"],
        queryFn: () =>
          fetch("/api/categories")
            .then((r) => r.json())
            .then((d: { categories: unknown[] }) => d.categories),
      });
      break;
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <>
      <div className="border-b border-sidebar-border px-6 py-5">
        <p className="text-lg font-semibold tracking-tight text-foreground">
          Finance
        </p>
        <p className="text-xs text-muted-foreground">Personal dashboard</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              onMouseEnter={() => prefetchRoute(queryClient, href)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <ThemePicker />
      </div>

      <div className="border-t border-sidebar-border p-4">
        <SignOutButton onSignedOut={() => setMobileOpen(false)} />
      </div>
    </>
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="fixed left-4 top-4 z-50 border-border bg-card md:hidden"
        onClick={() => setMobileOpen((open) => !open)}
        aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
      >
        {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
      </Button>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation overlay"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
