import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "disabled:opacity-50 disabled:pointer-events-none",
          variant === "primary" && "bg-slate-900 text-white hover:bg-black shadow-xs",
          variant === "secondary" && "bg-surface-elevated text-text-primary border border-border hover:bg-slate-100",
          variant === "ghost" && "text-text-secondary hover:text-text-primary hover:bg-surface-elevated",
          variant === "outline" && "border border-border bg-surface text-text-primary hover:bg-slate-50 hover:border-slate-300 shadow-xs",
          size === "sm" && "h-8 px-3 text-xs",
          size === "md" && "h-9 px-4 text-sm",
          size === "lg" && "h-11 px-6 text-base",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
