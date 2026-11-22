"use client";

import { GlobalSearch } from "@/components/search/global-search";
import { Menu } from "lucide-react";

export interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-4 gap-4">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Activated Global Search */}
      <div className="flex-1 max-w-lg">
        <GlobalSearch
          placeholder="Search models, providers, labs..."
          shortcutHint="⌘K"
          variant="header"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side wordmark */}
      <div className="hidden md:flex items-center gap-2 text-sm text-text-tertiary">
        <span className="font-medium">
          AI <span className="text-accent">Details</span>
        </span>
      </div>
    </header>
  );
}
