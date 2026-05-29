"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";

import { Button } from "@/components/ui/button";

async function fetchLinkToken() {
  const response = await fetch("/api/plaid/link-token", { method: "POST" });
  if (!response.ok) {
    throw new Error("Failed to create link token");
  }
  return response.json() as Promise<{ link_token: string }>;
}

async function exchangeToken(publicToken: string) {
  const response = await fetch("/api/plaid/exchange-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public_token: publicToken }),
  });

  if (!response.ok) {
    throw new Error("Failed to connect bank account");
  }

  return response.json();
}

interface PlaidLinkProps {
  onSuccess?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function PlaidLink({ onSuccess, children, className }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);

  useEffect(() => {
    fetchLinkToken()
      .then((data) => setLinkToken(data.link_token))
      .catch(() => setLinkToken(null));
  }, []);

  const handleSuccess = useCallback(
    async (publicToken: string) => {
      await exchangeToken(publicToken);
      onSuccess?.();
    },
    [onSuccess]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken) => {
      void handleSuccess(publicToken);
    },
  });

  return (
    <Button
      type="button"
      className={className}
      onClick={() => open()}
      disabled={!ready || !linkToken}
    >
      {children ?? "Connect Bank"}
    </Button>
  );
}
