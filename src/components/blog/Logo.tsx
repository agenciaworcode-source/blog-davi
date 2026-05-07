export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
        <span className="font-serif text-lg font-bold text-primary">LFM</span>
        <svg className="absolute -right-1 -top-1 h-3 w-3 text-primary" viewBox="0 0 12 12" fill="currentColor">
          <path d="M2 10 L10 2 M10 2 H5 M10 2 V7" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="font-serif text-base font-semibold tracking-tight">LFM Insights</div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Economia & Mercado</div>
      </div>
    </div>
  );
}
