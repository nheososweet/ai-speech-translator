"use client";

import { memo } from "react";
import type { ChangeEvent, DragEvent, RefObject } from "react";
import { FileAudioIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UploadPanelProps {
  busyProcessing: boolean;
  isDraggingUpload: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  selectedFile: File | null;
  selectedFileName: string | null;
  selectedFileSizeLabel: string;
  selectedFileDurationLabel: string;
  filePreviewUrl: string | null;
  uploadWarning: string | null;
  onDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onProcessSelectedFile: () => void;
  onClearSelectedFile: () => void;
}

function UploadPanelView({
  busyProcessing,
  isDraggingUpload,
  fileInputRef,
  selectedFile,
  selectedFileName,
  selectedFileSizeLabel,
  selectedFileDurationLabel,
  filePreviewUrl,
  uploadWarning,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  onProcessSelectedFile,
  onClearSelectedFile,
}: UploadPanelProps) {
  return (
    <div className="mt-5 space-y-3">
      <label className="text-sm font-medium text-foreground">
        Tải lên tệp WAV/MP3
      </label>

      <div
        className={`rounded-2xl border border-dashed p-4 transition-colors ${
          isDraggingUpload
            ? "border-primary bg-primary/5"
            : "border-border/70 bg-muted/20"
        } ${busyProcessing ? "opacity-70" : ""}`}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background shadow-sm">
              <FileAudioIcon className="size-5 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Kéo thả file vào đây hoặc chọn từ máy
              </p>
              <p className="text-xs text-muted-foreground">
                Hỗ trợ WAV, MP3, WebM, OGG. Giới hạn 100 MB.
              </p>
            </div>
          </div>

          <Input
            ref={fileInputRef}
            type="file"
            accept="audio/wav,audio/mp3,audio/mpeg,audio/webm,audio/ogg"
            onChange={onFileChange}
            disabled={busyProcessing}
          />
        </div>
      </div>

      {uploadWarning ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          {uploadWarning}
        </p>
      ) : null}

      {selectedFileName ? (
        <div className="space-y-2 rounded-lg border border-border/70 bg-muted/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-foreground">
              Tệp đã chọn: {selectedFileName}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {selectedFileSizeLabel} • {selectedFileDurationLabel}
            </p>
          </div>

          {filePreviewUrl ? (
            <audio
              className="w-full"
              controls
              preload="metadata"
              src={filePreviewUrl}
            >
              Trình duyệt không hỗ trợ phát preview audio.
            </audio>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={onProcessSelectedFile}
              disabled={
                !selectedFile || busyProcessing || Boolean(uploadWarning)
              }
            >
              <FileAudioIcon className="size-4" />
              Bắt đầu xử lý tệp
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={onClearSelectedFile}
              disabled={busyProcessing}
            >
              <Trash2Icon className="size-4" />
              Xóa tệp
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const UploadPanel = memo(UploadPanelView);
