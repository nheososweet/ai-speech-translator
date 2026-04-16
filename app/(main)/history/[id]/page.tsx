import { notFound } from "next/navigation";

import { HistoryDetailView } from "@/components/history/history-detail-view";
import { getMeetingById } from "@/lib/mock/meetings";

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meeting = getMeetingById(id);

  if (!meeting) {
    notFound();
  }

  return <HistoryDetailView meeting={meeting} />;
}
