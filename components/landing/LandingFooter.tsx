import Image from "next/image";
import Link from "next/link";
import { Code2 } from "lucide-react";

import { APP_NAME, GITHUB_HREF } from "@/components/landing/constants";

const STACK = ["Next.js", "TypeScript", "Supabase", "Plaid", "Claude", "Vercel"];

export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-10 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt={APP_NAME} width={24} height={24} className="size-6" />
          <span className="font-semibold">{APP_NAME}</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {STACK.map((tech) => (
            <span key={tech}>{tech}</span>
          ))}
        </div>

        <Link
          href={GITHUB_HREF}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Code2 className="size-4" />
          Source
        </Link>
      </div>
    </footer>
  );
}
