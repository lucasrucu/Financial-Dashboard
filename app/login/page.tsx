"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<"google" | "passkey" | null>(null);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "auth"
      ? "Sign-in failed. Please try again."
      : null
  );

  const supabase = createClient();
  const next = searchParams.get("next") ?? "/";

  async function signInWithGoogle() {
    setLoading("google");
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(null);
    }
  }

  async function signInWithPasskey() {
    setLoading("passkey");
    setError(null);

    try {
      const auth = supabase.auth as typeof supabase.auth & {
        signInWithWebAuthn?: () => Promise<{ error: Error | null }>;
      };

      if (!auth.signInWithWebAuthn) {
        setError("Passkey sign-in is not enabled in this Supabase project.");
        setLoading(null);
        return;
      }

      const { error: authError } = await auth.signInWithWebAuthn();

      if (authError) {
        setError(authError.message);
        setLoading(null);
        return;
      }

      await fetch("/api/auth/migrate-data", { method: "POST" });
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey sign-in failed");
      setLoading(null);
    }
  }

  return (
    <Card className="w-full max-w-md border-border bg-card">
      <CardHeader className="text-center">
        <CardTitle>Financial Dashboard</CardTitle>
        <CardDescription>Sign in to view your finances</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          type="button"
          className="w-full"
          onClick={signInWithGoogle}
          disabled={loading !== null}
        >
          {loading === "google" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Continue with Google"
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full border-border"
          onClick={signInWithPasskey}
          disabled={loading !== null}
        >
          {loading === "passkey" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Sign in with passkey"
          )}
        </Button>

        {error ? (
          <p className="text-center text-sm text-negative">{error}</p>
        ) : null}

        <p className="text-center text-xs text-muted-foreground">
          Passkeys require WebAuthn enabled in Supabase Auth settings.
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
