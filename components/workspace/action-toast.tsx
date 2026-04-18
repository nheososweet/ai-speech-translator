export function ActionToast({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 rounded-lg border border-border/70 bg-background/95 px-3 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur">
      {message}
    </div>
  );
}
