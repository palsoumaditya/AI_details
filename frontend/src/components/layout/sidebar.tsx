"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Compass,
  GitCompareArrows,
  Trophy,
  Server,
  FlaskConical,
  X,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Discover", href: "/", icon: <Compass className="h-4 w-4" /> },
  { label: "Compare", href: "/compare", icon: <GitCompareArrows className="h-4 w-4" /> },
  { label: "Rankings", href: "/rankings", icon: <Trophy className="h-4 w-4" /> },
  { label: "Providers", href: "/providers", icon: <Server className="h-4 w-4" /> },
  { label: "AI Labs", href: "/labs", icon: <FlaskConical className="h-4 w-4" /> },
];

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 bg-surface border-r border-border flex flex-col",
          "transform transition-transform duration-200 ease-in-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border shrink-0">
          <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="h-7 w-7 rounded-lg bg-slate-900 flex items-center justify-center shadow-xs">
              <span className="text-white font-bold text-xs tracking-tight">AD</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900 text-sm tracking-tight block leading-tight">
                AI <span className="text-accent">Details</span>
              </span>
              <span className="homemade-apple-regular text-[10px] text-slate-500 block leading-tight">
                model intelligence
              </span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <ul className="space-y-1" role="list">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-slate-900 text-white shadow-xs font-semibold"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border shrink-0 space-y-0.5">
          <p className="text-[10px] text-text-tertiary">
            AI Details v0.1.0 · AI Intelligence
          </p>
          <p className="homemade-apple-regular text-[11px] text-slate-500">
            the whole ecosystem, really
          </p>
        </div>
      </aside>
    </>
  );
}
