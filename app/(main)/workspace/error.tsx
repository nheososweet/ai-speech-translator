"use client";

import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6">
      <h2 className="text-base font-semibold text-destructive">
        Không thể tải Workspace
      </h2>
      <p className="mt-2 text-sm text-destructive/90">
        {error.message || "Đã xảy ra lỗi không xác định."}
      </p>
      <Button className="mt-4" variant="destructive" onClick={reset}>
        Thử tải lại
      </Button>
    </div>
  );
}
