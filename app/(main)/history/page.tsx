"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import {
  AudioLinesIcon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  LoaderCircleIcon,
  MailIcon,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRecordsQuery } from "@/hooks/services/use-records-query";
import type { PipelineRecord } from "@/services/pipeline-records.service";

const formatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const recipientEmailsSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập ít nhất 1 email người nhận.")
  .transform((input) =>
    input
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  )
  .pipe(
    z
      .array(z.string().email("Danh sách email có địa chỉ không hợp lệ."))
      .min(1, "Vui lòng nhập ít nhất 1 email người nhận."),
  );

const ReportDocViewer = dynamic(
  async () => {
    const mod = await import("@cyntler/react-doc-viewer");

    return function ReportDocViewerInner(props: {
      url: string;
      fileName: string;
    }) {
      return (
        <mod.default
          documents={[
            {
              uri: props.url,
              fileName: props.fileName,
            },
          ]}
          pluginRenderers={mod.DocViewerRenderers}
          style={{ height: "100%" }}
          config={{
            header: {
              disableHeader: true,
              disableFileName: true,
            },
          }}
        />
      );
    };
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircleIcon className="size-4 animate-spin" />
        Đang tải trình xem tài liệu...
      </div>
    ),
  },
);

export default function HistoryPage() {
  const [previewTranscriptByRecord, setPreviewTranscriptByRecord] = useState<
    Record<number, string>
  >({});
  const [loadingTranscriptRecordId, setLoadingTranscriptRecordId] = useState<
    number | null
  >(null);
  const [previewAudioRecordId, setPreviewAudioRecordId] = useState<
    number | null
  >(null);
  const [previewTranscriptRecordId, setPreviewTranscriptRecordId] = useState<
    number | null
  >(null);
  const [previewReportRecordId, setPreviewReportRecordId] = useState<
    number | null
  >(null);
  const [sendEmailRecordId, setSendEmailRecordId] = useState<number | null>(
    null,
  );
  const [emailRecipientsInput, setEmailRecipientsInput] = useState("");
  const [emailValidationError, setEmailValidationError] = useState<
    string | null
  >(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recordsQuery = useRecordsQuery();

  const recordMetrics = useMemo(() => {
    const records = recordsQuery.data ?? [];

    return {
      total: records.length,
      withReport: records.filter((record) => Boolean(record.reportUrl)).length,
      withoutReport: records.filter((record) => !record.reportUrl).length,
    };
  }, [recordsQuery.data]);

  const activeTranscriptRecord = useMemo(() => {
    if (!previewTranscriptRecordId) {
      return null;
    }

    return (
      recordsQuery.data?.find(
        (record) => record.id === previewTranscriptRecordId,
      ) ?? null
    );
  }, [previewTranscriptRecordId, recordsQuery.data]);

  const selectedSendEmailRecord = useMemo(() => {
    if (!sendEmailRecordId) {
      return null;
    }

    return recordsQuery.data?.find((r) => r.id === sendEmailRecordId) ?? null;
  }, [sendEmailRecordId, recordsQuery.data]);

  const activeReportRecord = useMemo(() => {
    if (!previewReportRecordId) {
      return null;
    }

    return (
      recordsQuery.data?.find(
        (record) => record.id === previewReportRecordId,
      ) ?? null
    );
  }, [previewReportRecordId, recordsQuery.data]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showActionToast(message: string) {
    setActionToast(message);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setActionToast(null);
    }, 2200);
  }

  async function copyTextWithToast(text: string, successMessage: string) {
    const normalizedText = text.trim();

    if (!normalizedText) {
      showActionToast("Không có nội dung để copy.");
      return;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(normalizedText);
      } else if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = normalizedText;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      } else {
        throw new Error("Clipboard API unavailable");
      }

      showActionToast(successMessage);
    } catch {
      showActionToast("Copy thất bại, vui lòng thử lại.");
    }
  }

  function handleCopyTranscriptPreview() {
    if (!previewTranscriptRecordId) {
      return;
    }

    const content = previewTranscriptByRecord[previewTranscriptRecordId] ?? "";
    void copyTextWithToast(content, "Đã copy transcript.");
  }

  async function handlePreviewTranscript(record: PipelineRecord) {
    if (previewTranscriptRecordId === record.id) {
      setPreviewTranscriptRecordId(null);
      return;
    }

    setPreviewTranscriptRecordId(record.id);

    if (previewTranscriptByRecord[record.id]) {
      return;
    }

    setLoadingTranscriptRecordId(record.id);

    try {
      const response = await axios.get<string>(record.transcribeUrl, {
        responseType: "text",
        timeout: 60_000,
      });

      setPreviewTranscriptByRecord((prev) => ({
        ...prev,
        [record.id]: response.data ?? "",
      }));
    } catch {
      setPreviewTranscriptByRecord((prev) => ({
        ...prev,
        [record.id]: "Không đọc được nội dung transcript từ link hiện tại.",
      }));
    } finally {
      setLoadingTranscriptRecordId(null);
    }
  }

  function handleToggleAudioPreview(recordId: number) {
    setPreviewAudioRecordId((prev) => (prev === recordId ? null : recordId));
  }

  function buildDownloadUrl(url: string): string {
    return url;
  }

  function resolveTranscriptFilename(filename: string): string {
    if (filename.toLowerCase().endsWith(".wav")) {
      return filename.replace(/\.wav$/i, ".txt");
    }

    const dotIndex = filename.lastIndexOf(".");
    if (dotIndex === -1) {
      return `${filename}.txt`;
    }

    return `${filename.slice(0, dotIndex)}.txt`;
  }

  function handlePreviewReport(record: PipelineRecord) {
    if (!record.reportUrl) {
      return;
    }

    if (previewReportRecordId === record.id) {
      setPreviewReportRecordId(null);
      return;
    }

    setPreviewReportRecordId(record.id);
  }

  function resolveReportFilename(filename: string, reportUrl: string): string {
    const extension = (() => {
      try {
        const extracted = new URL(reportUrl).pathname
          .split(".")
          .pop()
          ?.toLowerCase();

        return extracted ? `.${extracted}` : ".docx";
      } catch {
        return ".docx";
      }
    })();

    if (filename.toLowerCase().endsWith(".wav")) {
      return filename.replace(/\.wav$/i, `_report${extension}`);
    }

    const dotIndex = filename.lastIndexOf(".");
    if (dotIndex === -1) {
      return `${filename}_report${extension}`;
    }

    return `${filename.slice(0, dotIndex)}_report${extension}`;
  }

  function handleOpenSendEmailDialog(recordId: number) {
    setSendEmailRecordId(recordId);
    setEmailRecipientsInput("");
    setEmailValidationError(null);
  }

  function handleCloseSendEmailDialog() {
    setSendEmailRecordId(null);
    setEmailRecipientsInput("");
    setEmailValidationError(null);
  }

  async function handleSendEmail() {
    if (!sendEmailRecordId || isSendingEmail) {
      return;
    }

    const record = recordsQuery.data?.find((r) => r.id === sendEmailRecordId);
    if (!record?.reportUrl) {
      setEmailValidationError("Bản ghi này chưa có biên bản để gửi.");
      return;
    }

    const parsed = recipientEmailsSchema.safeParse(emailRecipientsInput);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message;
      setEmailValidationError(message ?? "Danh sách email không hợp lệ.");
      return;
    }

    setEmailValidationError(null);
    setIsSendingEmail(true);

    try {
      await axios.post("/api/agent/send-email", {
        recipients: parsed.data,
        meetingTitle: record.filename,
        reportUrl: record.reportUrl,
        sessionId: process.env.NEXT_PUBLIC_AGENT_MOM_EMAIL_SESSION_ID,
      });

      handleCloseSendEmailDialog();
      showActionToast("Đã gửi email thành công.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Lỗi không xác định";
      setEmailValidationError(`Gửi email thất bại: ${message}`);
      showActionToast(`Gửi email thất bại: ${message}`);
    } finally {
      setIsSendingEmail(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border/80 bg-card p-5 shadow-sm lg:sticky lg:top-4 lg:h-[calc(100dvh-8.5rem)]">
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Lịch sử cuộc họp
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Xem lại các bản ghi đã xử lý, tải tệp và gửi biên bản qua email.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-md border border-border/70 bg-muted/40 px-2 py-1">
              Tổng bản ghi: {recordMetrics.total}
            </span>
            <span className="rounded-md border border-border/70 bg-muted/40 px-2 py-1">
              Đã có biên bản: {recordMetrics.withReport}
            </span>
            <span className="rounded-md border border-border/70 bg-muted/40 px-2 py-1">
              Chưa có biên bản: {recordMetrics.withoutReport}
            </span>
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-lg">
          {recordsQuery.isLoading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" />
              Đang tải danh sách bản ghi...
            </div>
          ) : recordsQuery.isError ? (
            <div className="p-4 text-sm text-rose-600 dark:text-rose-400">
              Không tải được danh sách bản ghi.
            </div>
          ) : recordsQuery.data?.length ? (
            <div className="space-y-3 p-3">
              {recordsQuery.data.map((record) => (
                <div
                  key={record.id}
                  className={`grid gap-3 rounded-md border border-border/70 border-l-4 bg-background p-4 transition-colors hover:bg-muted/20 ${
                    record.reportUrl
                      ? "border-l-emerald-500/70"
                      : "border-l-muted-foreground/30"
                  }`}
                >
                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2
                          className="max-w-full truncate text-sm font-semibold text-foreground"
                          title={record.filename}
                        >
                          {record.filename}
                        </h2>
                        <span className="rounded-md border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                          ID #{record.id}
                        </span>
                        {!record.reportUrl ? (
                          <span className="rounded-md border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                            Chưa có biên bản
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tạo lúc {formatter.format(new Date(record.createTime))}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-1.5 md:flex-nowrap md:justify-end">
                      <a
                        href={buildDownloadUrl(record.audioUrl)}
                        download={record.filename}
                        className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <DownloadIcon className="size-3.5" />
                        Tải âm thanh
                      </a>
                      <a
                        href={buildDownloadUrl(record.transcribeUrl)}
                        download={resolveTranscriptFilename(record.filename)}
                        className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <DownloadIcon className="size-3.5" />
                        Tải transcript
                      </a>
                      {record.reportUrl ? (
                        <a
                          href={buildDownloadUrl(record.reportUrl)}
                          download={resolveReportFilename(
                            record.filename,
                            record.reportUrl,
                          )}
                          className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          <DownloadIcon className="size-3.5" />
                          Tải biên bản
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleAudioPreview(record.id)}
                      className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <AudioLinesIcon className="size-3.5" />
                      {previewAudioRecordId === record.id
                        ? "Ẩn nghe thử"
                        : "Nghe thử"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePreviewTranscript(record)}
                      className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={loadingTranscriptRecordId === record.id}
                    >
                      <FileTextIcon className="size-3.5" />
                      {loadingTranscriptRecordId === record.id
                        ? "Đang tải transcript..."
                        : previewTranscriptRecordId === record.id
                          ? "Ẩn transcript"
                          : "Xem transcript"}
                    </button>

                    {record.reportUrl ? (
                      <button
                        type="button"
                        onClick={() => handlePreviewReport(record)}
                        className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FileTextIcon className="size-3.5" />
                        {previewReportRecordId === record.id
                          ? "Ẩn biên bản"
                          : "Xem biên bản"}
                      </button>
                    ) : (
                      <></>
                    )}

                    {record.reportUrl ? (
                      <button
                        type="button"
                        onClick={() => handleOpenSendEmailDialog(record.id)}
                        className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <MailIcon className="size-3.5" />
                        Gửi email
                      </button>
                    ) : null}
                  </div>

                  {previewAudioRecordId === record.id ? (
                    <div className="rounded-md border border-border/70 p-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Nghe thử tệp âm thanh
                      </p>
                      <audio
                        controls
                        preload="none"
                        src={record.audioUrl}
                        className="w-full"
                      >
                        Trình duyệt không hỗ trợ phát audio.
                      </audio>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-sm text-muted-foreground">
              Chưa có bản ghi nào.
            </div>
          )}
        </div>
      </section>

      <Dialog
        open={previewTranscriptRecordId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPreviewTranscriptRecordId(null);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="mb-2 flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col justify-between gap-0 overflow-hidden rounded-xl p-0 sm:mb-4 sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] sm:max-w-none"
        >
          <DialogHeader className="space-y-0 text-left">
            <DialogTitle className="px-4 pt-4 text-base sm:px-6 sm:pt-6">
              Xem nhanh transcript
            </DialogTitle>
            <DialogDescription className="px-4 pb-3 text-xs sm:px-6">
              {activeTranscriptRecord?.filename ??
                (previewTranscriptRecordId
                  ? `Bản ghi #${previewTranscriptRecordId}`
                  : "")}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-auto px-4 pb-4 sm:px-6 sm:pb-6">
            {previewTranscriptRecordId &&
            loadingTranscriptRecordId === previewTranscriptRecordId ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircleIcon className="size-4 animate-spin" />
                Đang tải nội dung transcript...
              </div>
            ) : (
              <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
                {(previewTranscriptRecordId
                  ? previewTranscriptByRecord[previewTranscriptRecordId]
                  : undefined) ?? "Chưa có nội dung transcript."}
              </pre>
            )}
          </div>

          <DialogFooter className="mx-0 mb-0 rounded-none border-t px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              onClick={handleCopyTranscriptPreview}
              disabled={
                !previewTranscriptRecordId ||
                loadingTranscriptRecordId === previewTranscriptRecordId
              }
            >
              <CopyIcon className="size-4" />
              Copy transcript
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Đóng
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={previewReportRecordId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPreviewReportRecordId(null);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="mb-2 flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col justify-between gap-0 overflow-hidden rounded-xl p-0 sm:mb-4 sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] sm:max-w-none"
        >
          <DialogHeader className="space-y-0 text-left">
            <DialogTitle className="px-4 pt-4 text-base sm:px-6 sm:pt-6">
              Xem nhanh biên bản
            </DialogTitle>
            <DialogDescription className="px-4 pb-3 text-xs sm:px-6">
              {activeReportRecord?.filename ??
                (previewReportRecordId
                  ? `Bản ghi #${previewReportRecordId}`
                  : "")}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-auto px-4 pb-4 sm:px-6 sm:pb-6">
            {activeReportRecord?.reportUrl ? (
              <div className="h-full min-h-[58dvh] overflow-hidden rounded-md border border-border/70 bg-background">
                <ReportDocViewer
                  url={activeReportRecord.reportUrl}
                  fileName={resolveReportFilename(
                    activeReportRecord.filename,
                    activeReportRecord.reportUrl,
                  )}
                />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Chưa có nội dung biên bản.
              </div>
            )}
          </div>

          <DialogFooter className="mx-0 mb-0 rounded-none border-t px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:justify-end">
            {activeReportRecord?.reportUrl ? (
              <Button
                type="button"
                variant="outline"
                className="gap-1.5"
                asChild
              >
                <a
                  href={activeReportRecord.reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mở tab mới
                </a>
              </Button>
            ) : null}
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Đóng
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={sendEmailRecordId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            handleCloseSendEmailDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gửi email biên bản</DialogTitle>
            <DialogDescription>
              Bạn đang gửi biên bản của tệp: {selectedSendEmailRecord?.filename}
            </DialogDescription>
          </DialogHeader>
          {selectedSendEmailRecord?.reportUrl ? (
            <div className="min-w-0 space-y-1 rounded-md border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                URL file biên bản
              </p>
              <a
                href={selectedSendEmailRecord.reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted-foreground transition-colors hover:text-primary hover:underline hover:underline-offset-2"
                title={selectedSendEmailRecord.reportUrl}
              >
                {selectedSendEmailRecord.reportUrl}
              </a>
            </div>
          ) : null}
          <div className="space-y-3">
            <div className="space-y-2">
              <label
                htmlFor="email-input"
                className="text-sm font-medium text-foreground"
              >
                Danh sách email người nhận (mỗi email một dòng hoặc cách nhau
                bằng dấu phẩy)
              </label>
              <textarea
                id="email-input"
                value={emailRecipientsInput}
                onChange={(e) => {
                  setEmailRecipientsInput(e.target.value);
                  if (emailValidationError) {
                    setEmailValidationError(null);
                  }
                }}
                rows={4}
                placeholder={"nguoi-nhan-1@congty.vn\nnguoi-nhan-2@congty.vn"}
                className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              {emailValidationError ? (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {emailValidationError}
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSendingEmail}>
                Hủy
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              className="gap-1.5"
            >
              {isSendingEmail ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              Gửi email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {actionToast ? (
        <div className="pointer-events-none fixed right-4 bottom-4 z-50 rounded-lg border border-border/70 bg-background/95 px-3 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur">
          {actionToast}
        </div>
      ) : null}
    </div>
  );
}
