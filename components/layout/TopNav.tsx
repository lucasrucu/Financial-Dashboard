"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CurrencyToggle } from "@/components/dashboard/CurrencyToggle";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function TopNav() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
      <div className="pl-12 md:pl-0" />

      <div className="flex items-center gap-3">
        <span className="text-base font-semibold tracking-wide text-foreground">
          Qori
        </span>
        <CurrencyToggle />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="hidden text-muted-foreground md:inline-flex"
          onClick={handleSignOut}
          disabled={loading}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
