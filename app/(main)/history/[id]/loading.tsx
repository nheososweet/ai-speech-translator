export default function HistoryDetailLoading() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <div className="h-40 animate-pulse rounded-lg border border-border/70 bg-muted/40 xl:col-span-2" />
      <div className="h-[420px] animate-pulse rounded-lg border border-border/70 bg-muted/40" />
      <div className="h-[420px] animate-pulse rounded-lg border border-border/70 bg-muted/40" />
      <div className="h-40 animate-pulse rounded-lg border border-border/70 bg-muted/40 xl:col-span-2" />
    </div>
  );
}
