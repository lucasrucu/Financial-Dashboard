import { cn } from "@/lib/utils";

interface PageWrapperProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export function PageWrapper({
  children,
  title,
  description,
  className,
}: PageWrapperProps) {
  return (
    <div className={cn("flex flex-1 flex-col", className)}>
      <div className="border-b border-border px-4 py-6 md:px-8">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="flex-1 p-4 md:p-8">{children}</div>
    </div>
  );
}
