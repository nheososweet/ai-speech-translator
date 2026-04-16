import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HistoryDetailNotFound() {
  return (
    <div className="rounded-lg border border-border/80 bg-card p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-foreground">
        Không tìm thấy phiên họp
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Mã phiên không tồn tại hoặc đã bị xóa khỏi danh sách lịch sử.
      </p>
      <Button asChild className="mt-4">
        <Link href="/history">Quay lại lịch sử</Link>
      </Button>
    </div>
  );
}
