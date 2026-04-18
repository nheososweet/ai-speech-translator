"use client";

import { useState } from "react";
import Image from "next/image";
import { ListFilterIcon, SlidersHorizontalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { initialMeeting } from "./_lib/constants";
import { statusConfig } from "./_lib/transcript-utils";
import type { AudioInputSource } from "@/lib/types/meeting";

import { UploadPanel } from "@/components/workspace/upload-panel";
import { RecordingPanel } from "@/components/workspace/recording-panel";
import { PipelineProgress } from "@/components/workspace/pipeline-progress";
import { SessionInfoCard } from "@/components/workspace/session-info-card";
import { MinutesSection } from "@/components/workspace/minutes-section";
import { TranscriptSection } from "@/components/workspace/transcript-section";
import { DiarizationSection } from "@/components/workspace/diarization-section";
import { SpeakerSummarySection } from "@/components/workspace/speaker-summary-section";
import { EmailDialog } from "@/components/workspace/email-dialog";
import { ActionToast } from "@/components/workspace/action-toast";

import { useAudioUploader } from "@/hooks/workspace/use-audio-uploader";
import { useAudioRecorder } from "@/hooks/workspace/use-audio-recorder";
import { useWorkspaceActions } from "@/hooks/workspace/use-workspace-actions";
import { usePipelineProcessor } from "@/hooks/workspace/use-pipeline-processor";

export default function WorkspacePage() {
  const [activeMeeting, setActiveMeeting] = useState(initialMeeting);
  const [inputMode, setInputMode] = useState<AudioInputSource>("upload");
  const [notice, setNotice] = useState<string | null>(null);

  const {
    selectedFile,
    selectedFileName,
    selectedFileSizeBytes,
    selectedFileDurationSecond,
    filePreviewUrl,
    uploadWarning,
    isDraggingUpload,
    uploadProgress,
    setUploadProgress,
    fileInputRef,
    selectedFileSizeLabel,
    clearUploadState,
    handleFileChange,
    handleUploadDragEnter,
    handleUploadDragOver,
    handleUploadDragLeave,
    handleUploadDrop,
  } = useAudioUploader(setNotice);

  const {
    isRecording,
    recordingElapsedMs,
    recordingSecond,
    recordingPreviewUrl,
    recordingFile,
    discardRecordingPreviewOnStopRef,
    clearRecordingState,
    startRecording,
    stopRecording,
    recordingDurationLabel: tempRecordingDurationLabel, // Will re-calculate internally or we can just use formatTimelineSecond from recordingElapsedMs
  } = useAudioRecorder(setNotice);
  // Wait, I missed exporting recordingDurationLabel in useAudioRecorder. 
  // Let me just format it here.
  const formatPlaybackTime = (seconds: number) => {
    const safe = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safe / 60);
    const remainSeconds = safe % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainSeconds).padStart(2, "0")}`;
  };
  const recordingDurationLabel = formatPlaybackTime(recordingSecond);

  const {
    pipelineSteps,
    failedStepId,
    processingProgress,
    stageProgress,
    shouldShowPipeline,
    canRetryPipeline,
    busyProcessing,
    startProcessing,
    resetPipelineSteps,
  } = usePipelineProcessor({
    activeMeeting,
    setActiveMeeting,
    setNotice,
    setUploadProgress,
  });

  const {
    emailRecipientsInput,
    setEmailRecipientsInput,
    emailValidationError,
    setEmailValidationError,
    isEmailDialogOpen,
    setIsEmailDialogOpen,
    isMinutesDialogOpen,
    setIsMinutesDialogOpen,
    minutesDraft,
    setMinutesDraft,
    minutesValidationError,
    isSavingMinutes,
    isSendingEmail,
    actionToast,
    handleOpenMinutesEditor,
    handleSaveMinutesDraft,
    handleSubmitSendEmail,
    handleCopyRawTranscript,
    handleCopyRefinedTranscript,
  } = useWorkspaceActions({
    activeMeeting,
    setActiveMeeting,
    setNotice,
  });

  function handleSwitchMode(mode: AudioInputSource) {
    if (busyProcessing) {
      setNotice(`Không thể chuyển chế độ khi pipeline đang ${activeMeeting.processingStatus === "uploading" ? "tải lên" : "xử lý"}.`);
      return;
    }

    if (mode === "upload") {
      clearRecordingState();
    } else {
      clearUploadState();
    }

    resetPipelineSteps();
    setInputMode(mode);
    setNotice(null);
    setActiveMeeting((prev) => ({
      ...initialMeeting,
      title: mode === "upload" ? prev.title : "Phiên thu âm mới",
      inputSource: mode,
    }));
  }

  function handleProcessSelectedFile() {
    startProcessing(
      "upload",
      selectedFileName ?? "file_da_chon.mp3",
      selectedFileDurationSecond ?? 60,
      selectedFile
    );
  }

  function handleProcessRecording() {
    startProcessing("record", "Ban_thu_am_truc_tiep.webm", recordingSecond, recordingFile);
  }

  const { label: statusLabel, className: statusClassName } = statusConfig(activeMeeting.processingStatus);
  const shouldShowRefinedTranscript = activeMeeting.processingStatus === "completed" || (activeMeeting.refinedTranscript !== null && activeMeeting.refinedTranscript !== initialMeeting.rawTranscript);
  const shouldShowRefinedDiarization = activeMeeting.processingStatus === "completed" && activeMeeting.refinedTranscript !== null && activeMeeting.refinedTranscript !== initialMeeting.rawTranscript;

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      {/* Cột trái */}
      <div className="flex w-full flex-col border-b border-border/60 bg-muted/10 lg:w-[420px] lg:shrink-0 lg:border-b-0 lg:border-r xl:w-[480px]">
        <div className="flex items-center justify-between border-b border-border/60 p-4">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-foreground">
              Phiên dịch âm thanh
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${statusClassName}`}
            >
              {statusLabel}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground md:hidden"
          >
            <SlidersHorizontalIcon className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                Nguồn đầu vào
              </p>

              <div className="flex rounded-lg border border-border/60 bg-muted/30 p-1">
                <Button
                  type="button"
                  variant={inputMode === "upload" ? "default" : "ghost"}
                  onClick={() => handleSwitchMode("upload")}
                  className={`h-8 px-4 text-xs ${
                    inputMode === "upload"
                      ? "shadow-sm pointer-events-none"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  disabled={busyProcessing}
                >
                  Tải tệp
                </Button>
                <Button
                  type="button"
                  variant={inputMode === "record" ? "default" : "ghost"}
                  onClick={() => handleSwitchMode("record")}
                  className={`h-8 px-4 text-xs ${
                    inputMode === "record"
                      ? "shadow-sm pointer-events-none"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  disabled={busyProcessing}
                >
                  Thu âm
                </Button>
              </div>
            </div>

            {inputMode === "upload" ? (
              <UploadPanel
                busyProcessing={busyProcessing}
                isDraggingUpload={isDraggingUpload}
                fileInputRef={fileInputRef}
                selectedFile={selectedFile}
                selectedFileName={selectedFileName}
                selectedFileSizeLabel={selectedFileSizeLabel}
                selectedFileDurationLabel={
                  selectedFileDurationSecond
                    ? formatPlaybackTime(selectedFileDurationSecond)
                    : "--:--"
                }
                filePreviewUrl={filePreviewUrl}
                uploadWarning={uploadWarning}
                onDragEnter={handleUploadDragEnter}
                onDragOver={handleUploadDragOver}
                onDragLeave={handleUploadDragLeave}
                onDrop={(e) => handleUploadDrop(e, handleProcessSelectedFile)}
                onFileChange={(e) => handleFileChange(e, handleProcessSelectedFile)}
                onProcessSelectedFile={handleProcessSelectedFile}
                onClearSelectedFile={clearUploadState}
              />
            ) : (
              <RecordingPanel
                busyProcessing={busyProcessing}
                isRecording={isRecording}
                recordingSecond={recordingSecond}
                recordingPreviewUrl={recordingPreviewUrl}
                recordingDurationLabel={recordingDurationLabel}
                onToggleRecording={() => {
                  if (isRecording) {
                    stopRecording();
                  } else {
                    void startRecording();
                  }
                }}
                onProcessRecording={handleProcessRecording}
                onClearRecording={clearRecordingState}
              />
            )}

            {shouldShowPipeline ? (
              <PipelineProgress
                pipelineSteps={pipelineSteps}
                stageProgress={stageProgress}
                failedStepId={failedStepId}
                canRetryPipeline={canRetryPipeline}
                onRetry={() => {
                  if (inputMode === "upload") {
                    handleProcessSelectedFile();
                  } else {
                    handleProcessRecording();
                  }
                }}
              />
            ) : null}

            <SessionInfoCard
              title={activeMeeting.title}
              inputSource={activeMeeting.inputSource}
              speakerCount={activeMeeting.speakerCount}
              durationSecond={activeMeeting.durationSecond}
              isRecording={isRecording}
              recordingElapsedMs={recordingElapsedMs}
            />
          </div>
        </div>
      </div>

      {activeMeeting.processingStatus === "idle" ? (
        <div className="hidden flex-1 items-center justify-center bg-muted/5 lg:flex">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-6 flex size-20 items-center justify-center rounded-3xl border border-border bg-background shadow-xs">
              <Image
                src="/icons/logo.svg"
                alt="Workspace Icon"
                width={40}
                height={40}
                priority
                className="opacity-80"
              />
            </div>
            <h3 className="mb-2 text-xl font-medium text-foreground">
              Không gian làm việc trống
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Vui lòng tải lên tệp âm thanh hoặc bắt đầu thu âm trực tiếp để hệ
              thống thực hiện bóc băng và tóm tắt theo từng người nói.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-1 flex-col bg-background">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-muted/10 px-4 md:px-6">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground md:hidden"
              >
                <ListFilterIcon className="size-4" />
              </Button>
              <h2 className="text-sm font-semibold tracking-tight text-foreground md:text-base">
                Kết quả xử lý
              </h2>
            </div>
            <EmailDialog
              isOpen={isEmailDialogOpen}
              onOpenChange={(open) => {
                if (!open && isSendingEmail) return;
                setIsEmailDialogOpen(open);
                if (open) {
                  setEmailValidationError(null);
                }
              }}
              canSendEmail={
                activeMeeting.processingStatus === "completed" &&
                Boolean(activeMeeting.reportUrl?.trim())
              }
              reportUrl={activeMeeting.reportUrl}
              recipientsInput={emailRecipientsInput}
              onRecipientsChange={setEmailRecipientsInput}
              validationError={emailValidationError}
              isSending={isSendingEmail}
              onSubmit={handleSubmitSendEmail}
            />
          </header>

          <div className="flex-1 overflow-auto p-4 md:p-6 custom-scrollbar">
            {notice ? (
              <div
                className={`mb-6 flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm shadow-xs ${
                  activeMeeting.processingStatus === "error"
                    ? "border-rose-200 bg-rose-50/50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300"
                    : activeMeeting.processingStatus === "completed"
                      ? "border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"
                      : "border-sky-200 bg-sky-50/50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`size-2 shrink-0 rounded-full ${
                      activeMeeting.processingStatus === "error"
                        ? "bg-rose-500"
                        : activeMeeting.processingStatus === "completed"
                          ? "bg-emerald-500"
                          : "animate-pulse bg-sky-500"
                    }`}
                  />
                  <span>
                    Tiến độ tổng: {stageProgress}% — {notice}
                  </span>
                </div>
              </div>
            ) : null}

            <MinutesSection
              minutes={activeMeeting.minutes}
              reportUrl={activeMeeting.reportUrl}
              isDialogOpen={isMinutesDialogOpen}
              onOpenChange={(open) => {
                if (!open && isSavingMinutes) return;
                setIsMinutesDialogOpen(open);
                if (!open && !isSavingMinutes) {
                  setMinutesValidationError(null);
                }
              }}
              minutesDraft={minutesDraft}
              onDraftChange={setMinutesDraft}
              minutesValidationError={minutesValidationError}
              isSaving={isSavingMinutes}
              onSave={handleSaveMinutesDraft}
              onOpenEditor={handleOpenMinutesEditor}
            />

            <TranscriptSection
              rawTranscript={activeMeeting.rawTranscript}
              refinedTranscript={activeMeeting.refinedTranscript}
              shouldShowRefined={shouldShowRefinedTranscript}
              onCopyRaw={handleCopyRawTranscript}
              onCopyRefined={handleCopyRefinedTranscript}
            />

            <div className="mt-6 grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_500px]">
              <DiarizationSection
                segments={activeMeeting.segments}
                refinedSegments={activeMeeting.segments} // using segments as refinedSegments currently if no separate API endpoint
                speakerCount={activeMeeting.speakerCount}
                shouldShowRefinedDiarization={shouldShowRefinedDiarization}
              />
              <SpeakerSummarySection
                speakerSummaries={activeMeeting.speakerSummaries}
              />
            </div>
          </div>
        </div>
      )}

      <ActionToast message={actionToast} />
    </div>
  );
}
