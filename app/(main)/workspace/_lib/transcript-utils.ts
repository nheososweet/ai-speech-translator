import type {
  ProcessingStatus,
  SpeakerSummary,
  TranscriptSegment,
} from "@/lib/types/meeting";
import {
  ACCEPTED_AUDIO_EXTENSIONS,
  ACCEPTED_AUDIO_MIME_TYPES,
  DIARIZATION_LINE_PATTERN,
  PIPELINE_STEP_BLUEPRINT,
  SPEAKER_TAG_PATTERN,
  sourceMeeting,
} from "./constants";
import type { PipelineStep } from "./workspace-types";
import type { MutableRefObject } from "react";

export function cleanTranscriptLine(line: string): string {
  return line.trim().replace(/^"+|"+$/g, "");
}

export function formatTimelineSecond(second: number): string {
  if (!Number.isFinite(second) || second < 0) {
    return "00:00";
  }

  const wholeSecond = Math.floor(second);
  const minute = Math.floor(wholeSecond / 60);
  const remainSecond = wholeSecond % 60;
  const millis = Math.round((second - wholeSecond) * 100);

  return `${String(minute).padStart(2, "0")}:${String(remainSecond).padStart(
    2,
    "0",
  )}.${String(Math.max(0, Math.min(99, millis))).padStart(2, "0")}`;
}

export function parseTranscriptSegments(lines: string[]): TranscriptSegment[] {
  return lines
    .map((line, index) => {
      const normalizedLine = cleanTranscriptLine(line);
      const parsed = normalizedLine.match(DIARIZATION_LINE_PATTERN);

      if (!parsed) {
        return null;
      }

      const speakerIndex = parsed[1];
      const startSecond = Number.parseFloat(parsed[2]);
      const endSecond = Number.parseFloat(parsed[3]);
      const text = parsed[4]?.trim();

      if (
        !Number.isFinite(startSecond) ||
        !Number.isFinite(endSecond) ||
        !text
      ) {
        return null;
      }

      return {
        id: `seg-api-${index + 1}`,
        speaker: `Người ${speakerIndex}`,
        startSecond,
        endSecond,
        text,
      };
    })
    .filter((segment): segment is TranscriptSegment => Boolean(segment));
}

export function deriveSpeakerCount(
  lines: string[],
  segments: TranscriptSegment[],
): number {
  if (segments.length) {
    return new Set(segments.map((segment) => segment.speaker)).size;
  }

  const speakers = lines
    .map((line) =>
      cleanTranscriptLine(line).match(SPEAKER_TAG_PATTERN)?.[0]?.trim(),
    )
    .filter((speaker): speaker is string => Boolean(speaker));

  return new Set(speakers).size;
}

export function buildSpeakerSummariesFromSegments(
  segments: TranscriptSegment[],
): SpeakerSummary[] {
  if (!segments.length) {
    return sourceMeeting.speakerSummaries;
  }

  const groupedSegments = segments.reduce<Record<string, TranscriptSegment[]>>(
    (acc, segment) => {
      const key = segment.speaker;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(segment);
      return acc;
    },
    {},
  );

  return Object.entries(groupedSegments).map(([speaker, speakerSegments]) => ({
    speaker,
    keyPoints: [
      `Tham gia ${speakerSegments.length} lượt phát biểu trong phiên hiện tại.`,
      `Khung trao đổi chính: ${formatTimelineSecond(
        speakerSegments[0].startSecond,
      )} - ${formatTimelineSecond(
        speakerSegments[speakerSegments.length - 1].endSecond,
      )}.`,
      "Đây là tóm tắt giả lập, sẽ thay bằng output agent ở bước sau.",
    ],
  }));
}

export function speakerToneClass(speaker: string): string {
  const palette = [
    "border-l-sky-500 bg-sky-50/80 dark:border-l-sky-300 dark:bg-sky-950/40",
    "border-l-emerald-500 bg-emerald-50/80 dark:border-l-emerald-300 dark:bg-emerald-950/40",
    "border-l-amber-500 bg-amber-50/80 dark:border-l-amber-300 dark:bg-amber-950/40",
    "border-l-teal-500 bg-teal-50/80 dark:border-l-teal-300 dark:bg-teal-950/40",
  ];
  const hash = speaker
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length] ?? palette[0];
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return `${minutes}m ${String(remainSeconds).padStart(2, "0")}s`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isSupportedAudioFile(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return (
    ACCEPTED_AUDIO_MIME_TYPES.has(file.type) ||
    ACCEPTED_AUDIO_EXTENSIONS.has(extension)
  );
}

export function statusConfig(status: ProcessingStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "completed":
      return {
        label: "Hoàn tất",
        className:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
      };
    case "processing":
      return {
        label: "Đang xử lý",
        className:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      };
    case "uploading":
      return {
        label: "Đang tải lên",
        className:
          "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
      };
    case "error":
      return {
        label: "Lỗi xử lý",
        className:
          "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
      };
    default:
      return {
        label: "Chờ thao tác",
        className:
          "bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-300",
      };
  }
}

export function createInitialPipelineSteps(): PipelineStep[] {
  return PIPELINE_STEP_BLUEPRINT.map((step) => ({
    ...step,
    status: "pending",
    progress: 0,
  }));
}

export function clearTimer(
  timerRef: MutableRefObject<ReturnType<typeof setInterval> | null>,
) {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}
