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
        variant === "accent" && "bg-slate-900 text-white border border-slate-900 shadow-2xs",
        variant === "success" && "bg-slate-100 text-slate-800 border border-slate-200",
        variant === "outline" && "border border-border text-text-secondary bg-surface",
        className
      )}
    >
      {children}
    </span>
  );
}
