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
        variant === "default" && "bg-slate-100 text-slate-700 border border-slate-200/80",
        variant === "accent" && "bg-indigo-50 text-indigo-700 border border-indigo-200/70",
        variant === "success" && "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
        variant === "outline" && "border border-border text-text-secondary bg-surface",
        className
      )}
    >
      {children}
    </span>
  );
}
