"use client";

import { memo, useMemo, useRef, useState } from "react";
import { HeadphonesIcon, MicIcon, PauseIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

interface RecordingPanelProps {
  busyProcessing: boolean;
  isRecording: boolean;
  recordingSecond: number;
  recordingPreviewUrl: string | null;
  recordingDurationLabel: string;
  onToggleRecording: () => void | Promise<void>;
  onProcessRecording: () => void;
  onClearRecording: () => void;
}

function formatPlaybackTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainSeconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainSeconds).padStart(2, "0")}`;
}

function RecordingPanelView({
  busyProcessing,
  isRecording,
  recordingSecond,
  recordingPreviewUrl,
  recordingDurationLabel,
  onToggleRecording,
  onProcessRecording,
  onClearRecording,
}: RecordingPanelProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playbackCurrentSecond, setPlaybackCurrentSecond] = useState(0);
  const [playbackDurationSecond, setPlaybackDurationSecond] = useState(recordingSecond);

  const playbackPercent = useMemo(() => {
    if (!playbackDurationSecond) {
      return 0;
    }

    return Math.min(100, (playbackCurrentSecond / playbackDurationSecond) * 100);
  }, [playbackCurrentSecond, playbackDurationSecond]);

  function handleLoadedMetadata() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    setPlaybackCurrentSecond(0);
    setPlaybackDurationSecond(recordingSecond);

    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setPlaybackDurationSecond(audio.duration);
    }
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    setPlaybackCurrentSecond(audio.currentTime);
  }

  function handleEnded() {
    setPlaybackCurrentSecond(playbackDurationSecond || recordingSecond);
  }

  return (
    <div className="mt-5 space-y-3 rounded-lg border border-border/70 bg-muted/30 p-3">
      <p className="text-sm font-medium text-foreground">Thu âm trực tiếp</p>
      <Button
        variant={isRecording ? "default" : "outline"}
        className="w-full justify-start gap-2"
        onClick={onToggleRecording}
        disabled={busyProcessing}
      >
        {isRecording ? (
          <PauseIcon className="size-4" />
        ) : (
          <MicIcon className="size-4" />
        )}
        {isRecording ? "Dừng thu âm" : "Bắt đầu thu âm"}
      </Button>

      {recordingSecond > 0 && !isRecording ? (
        <div className="space-y-2 rounded-md border border-border/70 bg-background p-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatPlaybackTime(playbackCurrentSecond)}</span>
              <span>{formatPlaybackTime(playbackDurationSecond || recordingSecond)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${playbackPercent}%` }}
              />
            </div>
          </div>

          {recordingPreviewUrl ? (
            <audio
              key={recordingPreviewUrl}
              ref={audioRef}
              className="w-full"
              controls
              preload="metadata"
              src={recordingPreviewUrl}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
            >
              Trình duyệt không hỗ trợ phát lại bản ghi.
            </audio>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="justify-start gap-2"
              onClick={onProcessRecording}
              disabled={busyProcessing || !recordingPreviewUrl}
            >
              <HeadphonesIcon className="size-4" />
              Xử lý bản thu {recordingDurationLabel}
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={onClearRecording}
              disabled={busyProcessing || isRecording}
            >
              <Trash2Icon className="size-4" />
              Xóa bản ghi
            </Button>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Đang ghi:{" "}
        {isRecording
          ? recordingDurationLabel
          : `Đã ghi ${recordingDurationLabel}`}
      </p>
    </div>
  );
}

export const RecordingPanel = memo(RecordingPanelView);
