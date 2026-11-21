import { cn } from "@/lib/utils";

export interface BadgeProps {
  variant?: "default" | "accent" | "success" | "outline";
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        variant === "default" && "bg-surface-elevated text-text-secondary",
        variant === "accent" && "bg-accent-muted text-accent",
        variant === "success" && "bg-success-muted text-success",
        variant === "outline" && "border border-border text-text-secondary",
        className
      )}
    >
      {children}
    </span>
  );
}
