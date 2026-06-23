import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APP_NAME, REQUEST_ACCESS_HREF, SIGN_IN_HREF } from "@/components/landing/constants";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/landing" className="flex items-center gap-2">
          <Image src="/logo.png" alt={APP_NAME} width={28} height={28} className="size-7" />
          <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href={SIGN_IN_HREF} className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
            Sign In
          </Link>
          <Link href={REQUEST_ACCESS_HREF} className={cn(buttonVariants({ size: "lg" }))}>
            Request Access
          </Link>
        </div>
      </div>
    </header>
  );
}
