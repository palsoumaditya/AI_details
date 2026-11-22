"use client";

import { Navbar } from "./navbar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
        {children}
      </main>
      <footer className="border-t border-border bg-white py-6 px-4 md:px-8 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-text-tertiary">
          <span>AI Details v0.1.0 · AI Intelligence Platform</span>
          <span className="homemade-apple-regular text-slate-500 text-xs">
            the whole ecosystem, really
          </span>
        </div>
      </footer>
    </div>
  );
}
