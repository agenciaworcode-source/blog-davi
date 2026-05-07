export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className="font-serif text-xl font-semibold tracking-tight text-foreground">
        LFM<span className="text-primary">.</span>
      </span>
      <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Insights</span>
    </div>
  );
}
