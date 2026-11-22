"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/search/global-search";
import {
  Compass,
  GitCompareArrows,
  Trophy,
  Server,
  FlaskConical,
  Menu,
  X,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Discover", href: "/", icon: <Compass className="h-3.5 w-3.5" /> },
  { label: "Compare", href: "/compare", icon: <GitCompareArrows className="h-3.5 w-3.5" /> },
  { label: "Rankings", href: "/rankings", icon: <Trophy className="h-3.5 w-3.5" /> },
  { label: "Providers", href: "/providers", icon: <Server className="h-3.5 w-3.5" /> },
  { label: "AI Labs", href: "/labs", icon: <FlaskConical className="h-3.5 w-3.5" /> },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-2 sm:top-3 z-40 w-full px-4 sm:px-6 pointer-events-none">
      <div className="max-w-6xl mx-auto h-12 rounded-xl sm:rounded-2xl border border-border bg-white/95 backdrop-blur-md shadow-xs px-3 sm:px-4 flex items-center justify-between gap-3 pointer-events-auto">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-5 sm:gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="h-7 w-7 rounded-lg border border-slate-300 bg-white flex items-center justify-center shadow-2xs">
              <span className="text-slate-900 font-bold text-xs tracking-tight">AD</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-slate-900 text-xs sm:text-sm tracking-tight leading-none">
                AI Details
              </span>
              <span className="homemade-apple-regular text-[10px] text-slate-500 leading-none hidden xl:inline-block">
                model intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-all duration-150",
                    isActive
                      ? "bg-white text-slate-900 font-semibold border border-slate-300 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Search & Mobile Menu Toggle */}
        <div className="flex items-center gap-2 flex-1 justify-end max-w-xs">
          <div className="w-full max-w-[170px] lg:max-w-[210px] hidden sm:block">
            <GlobalSearch
              placeholder="Search catalog..."
              shortcutHint="⌘K"
              variant="header"
            />
          </div>

          {/* Mobile hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation dropdown */}
      {mobileMenuOpen && (
        <div className="max-w-6xl mx-auto mt-2 rounded-xl border border-border bg-white shadow-lg p-3 space-y-2 pointer-events-auto md:hidden">
          <div className="sm:hidden mb-2">
            <GlobalSearch
              placeholder="Search catalog..."
              shortcutHint="⌘K"
              variant="header"
            />
          </div>
          <nav className="flex flex-col space-y-1" role="navigation" aria-label="Mobile navigation">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs transition-colors",
                    isActive
                      ? "bg-white text-slate-900 font-semibold border border-slate-300 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
