import { formatDuration } from "@/app/(main)/workspace/_lib/transcript-utils";
import type { AudioInputSource } from "@/lib/types/meeting";

interface SessionInfoCardProps {
  title: string;
  inputSource: AudioInputSource;
  speakerCount: number;
  durationSecond: number;
  isRecording: boolean;
  recordingElapsedMs: number;
}

export function SessionInfoCard({
  title,
  inputSource,
  speakerCount,
  durationSecond,
  isRecording,
  recordingElapsedMs,
}: SessionInfoCardProps) {
  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-muted/40 p-4">
      <h2 className="text-sm font-semibold text-foreground">
        Thông tin phiên hiện tại
      </h2>
      <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        <p>
          <span className="font-medium text-foreground">Tiêu đề:</span> {title}
        </p>
        <p>
          <span className="font-medium text-foreground">Nguồn vào:</span>{" "}
          {inputSource === "upload" ? "Tải tệp" : "Thu âm"}
        </p>
        <p>
          <span className="font-medium text-foreground">Số người nói:</span>{" "}
          {speakerCount}
        </p>
        <p>
          <span className="font-medium text-foreground">Thời lượng:</span>{" "}
          {formatDuration(
            isRecording
              ? Math.max(1, Math.round(recordingElapsedMs / 1000))
              : durationSecond,
          )}
        </p>
      </div>
    </div>
  );
}
