export function LoadingOverlay({ label = "Processing…" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-cream/85 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-black/10 bg-white px-10 py-8 shadow-2xl">
        <div className="relative h-20 w-20">
          <span className="absolute inset-0 rounded-full border-4 border-black/10" />
          <span className="absolute inset-0 rounded-full border-4 border-transparent border-t-ink border-r-gold animate-spin" />
          <span className="absolute inset-4 rounded-full bg-gradient-to-br from-white to-cream shadow-inner" />
          <span className="absolute inset-7 rounded-full bg-ink/85" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-ink/50">{label}</p>
      </div>
    </div>
  );
}
