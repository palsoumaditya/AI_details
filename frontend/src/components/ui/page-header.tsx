import { cn } from "@/lib/utils";
import { Badge } from "./badge";

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {badge && (
            <Badge variant="accent" className="mb-3">
              {badge}
            </Badge>
          )}
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-text-secondary mt-2 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
      </div>
    </div>
  );
}
