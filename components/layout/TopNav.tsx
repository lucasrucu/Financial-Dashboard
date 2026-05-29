import { CurrencyToggle } from "@/components/dashboard/CurrencyToggle";

export function TopNav() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 backdrop-blur md:px-8">
      <div className="pl-12 md:pl-0">
        <h1 className="text-sm font-medium text-muted-foreground">
          Financial Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <CurrencyToggle />
      </div>
    </header>
  );
}
