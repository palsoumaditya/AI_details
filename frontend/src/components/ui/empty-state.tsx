import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "./button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-20 px-6 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-surface-elevated text-text-tertiary">
          {icon}
        </div>
      )}
      <h2 className="text-lg font-semibold text-text-primary mb-2">{title}</h2>
      <p className="text-sm text-text-secondary max-w-md leading-relaxed">
        {description}
      </p>
      {actionLabel && actionHref && (
        <div className="mt-6">
          <Link href={actionHref}>
            <Button variant="outline" size="sm">
              {actionLabel}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
