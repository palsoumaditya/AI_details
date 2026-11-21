export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
      {/* Background radial gradient decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-slate-950 -z-10" />

      <div className="max-w-3xl w-full mx-auto text-center space-y-8">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium tracking-wide">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Phase 2A Initialized • Foundation Ready</span>
        </div>

        {/* Branding & Title */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white">
            One<span className="text-indigo-400">Atlas</span>
          </h1>
          <p className="text-xl sm:text-2xl font-semibold text-slate-200">
            AI Model Discovery &amp; Intelligence Platform
          </p>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Discover, evaluate, compare, and benchmark frontier and open-source AI models across top labs and inference providers.
          </p>
        </div>

        {/* System Stack Verification Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-left">
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <div className="text-xs text-slate-400 font-medium">Framework</div>
            <div className="text-sm font-semibold text-white mt-1">Next.js 16 (App Router)</div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <div className="text-xs text-slate-400 font-medium">Language</div>
            <div className="text-sm font-semibold text-white mt-1">TypeScript 5 Strict</div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <div className="text-xs text-slate-400 font-medium">Styling</div>
            <div className="text-sm font-semibold text-white mt-1">Tailwind CSS v4</div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <div className="text-xs text-slate-400 font-medium">Engine</div>
            <div className="text-sm font-semibold text-white mt-1">React 19</div>
          </div>
        </div>

        {/* Architecture Note */}
        <div className="pt-2">
          <p className="text-xs text-slate-500">
            OneAtlas Architecture Foundation • Ready for Phase 2B Database &amp; Prisma Configuration
          </p>
        </div>
      </div>
    </main>
  );
}
