import { useState, useRef, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { minutesDraftSchema, recipientEmailsSchema } from "@/app/(main)/workspace/_lib/constants";
import type { MeetingRecord } from "@/lib/types/meeting";
import { sendMeetingEmailViaAgent } from "@/lib/agent-client";

export function useWorkspaceActions({
  activeMeeting,
  setActiveMeeting,
  setNotice,
}: {
  activeMeeting: MeetingRecord;
  setActiveMeeting: Dispatch<SetStateAction<MeetingRecord>>;
  setNotice: (notice: string) => void;
}) {
  const [emailRecipientsInput, setEmailRecipientsInput] = useState("");
  const [emailValidationError, setEmailValidationError] = useState<string | null>(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isMinutesDialogOpen, setIsMinutesDialogOpen] = useState(false);
  const [minutesDraft, setMinutesDraft] = useState(activeMeeting.minutes);
  const [minutesValidationError, setMinutesValidationError] = useState<string | null>(null);
  const [isSavingMinutes, setIsSavingMinutes] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function handleOpenMinutesEditor() {
    setMinutesDraft(activeMeeting.minutes);
    setMinutesValidationError(null);
    setIsMinutesDialogOpen(true);
  }

  function handleSaveMinutesDraft() {
    if (isSavingMinutes) {
      return;
    }

    const parsed = minutesDraftSchema.safeParse(minutesDraft);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message;
      setMinutesValidationError(message ?? "Biên bản không hợp lệ.");
      return;
    }

    if (!activeMeeting.apiRecordId) {
      setMinutesValidationError("Không có ID phiên họp để lưu biên bản.");
      return;
    }

    setMinutesValidationError(null);
    setNotice("Đang lưu biên bản...");
    setIsSavingMinutes(true);

    void (async () => {
      try {
        const response = await fetch("/api/agent/save-minutes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: activeMeeting.apiRecordId,
            textContent: parsed.data,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = await response.json();

        if (result.status !== "success" || !result.reportUrl) {
          throw new Error(result.error || "Không thể lấy URL biên bản từ server.");
        }

        setActiveMeeting((prev) => ({
          ...prev,
          minutes: parsed.data,
          reportUrl: result.reportUrl,
        }));
        setMinutesDraft(parsed.data);
        setIsMinutesDialogOpen(false);
        setNotice("Đã lưu biên bản thành công. Vui lòng gửi email để chia sẻ.");
        showActionToast("Đã lưu biên bản thành công.");
        setIsEmailDialogOpen(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Lỗi không xác định";
        setMinutesValidationError(`Lỗi khi lưu biên bản: ${message}`);
        setNotice(`Lỗi lưu biên bản: ${message}`);
      } finally {
        setIsSavingMinutes(false);
      }
    })();
  }

  function handleSendEmail(recipients: string[]) {
    // Only checked externally, but can be checked here
    const canSendEmail = activeMeeting.processingStatus === "completed" && Boolean(activeMeeting.reportUrl?.trim());
    if (!canSendEmail || isSendingEmail) {
      if (!activeMeeting.reportUrl?.trim()) {
        setNotice("Vui lòng xem, chỉnh sửa và lưu biên bản để gửi email.");
      }
      return;
    }

    setIsSendingEmail(true);
    setNotice("Đang gọi agent để gửi email...");

    void (async () => {
      try {
        await sendMeetingEmailViaAgent({
          recipients,
          meetingTitle: activeMeeting.title,
          minutes: activeMeeting.minutes,
          rawTranscript: activeMeeting.rawTranscript,
          reportUrl: activeMeeting.reportUrl,
          sessionId: process.env.NEXT_PUBLIC_AGENT_MOM_EMAIL_SESSION_ID,
        });

        setActiveMeeting((prev) => ({
          ...prev,
          emailStatus: "sent",
          emailLogs: [
            ...recipients.map((recipient) => ({
              id: `email-${recipient}-${Date.now()}`,
              recipient,
              sentAt: new Date().toISOString(),
              status: "sent" as const,
            })),
            ...prev.emailLogs,
          ],
        }));
        setIsEmailDialogOpen(false);
        setNotice("Agent đã xử lý gửi email thành công.");
        showActionToast("Đã gửi email thành công.");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        setActiveMeeting((prev) => ({
          ...prev,
          emailStatus: "failed",
          emailLogs: [
            ...recipients.map((recipient) => ({
              id: `email-failed-${recipient}-${Date.now()}`,
              recipient,
              sentAt: new Date().toISOString(),
              status: "failed" as const,
            })),
            ...prev.emailLogs,
          ],
        }));
        setNotice(`Gửi email thất bại: ${errorMessage}`);
        showActionToast(`Gửi email thất bại: ${errorMessage}`);
      } finally {
        setIsSendingEmail(false);
      }
    })();
  }

  function handleSubmitSendEmail() {
    const parsed = recipientEmailsSchema.safeParse(emailRecipientsInput);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message;
      setEmailValidationError(message ?? "Danh sách email không hợp lệ.");
      return;
    }

    setEmailValidationError(null);
    handleSendEmail(parsed.data);
  }

  async function handleCopyRawTranscript() {
    const transcript = activeMeeting.rawTranscript.trim();

    if (!transcript) {
      showActionToast("Chưa có transcript để copy.");
      return;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(transcript);
      } else if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = transcript;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      showActionToast("Đã copy raw transcript.");
    } catch {
      showActionToast("Copy thất bại, vui lòng thử lại.");
    }
  }

  async function handleCopyRefinedTranscript() {
    const transcript = (activeMeeting.refinedTranscript ?? "").trim();

    if (!transcript) {
      showActionToast("Chưa có bản đã làm sạch để copy.");
      return;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(transcript);
      } else if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = transcript;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      showActionToast("Đã copy bản đã làm sạch.");
    } catch {
      showActionToast("Copy thất bại, vui lòng thử lại.");
    }
  }

  return {
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
    setMinutesValidationError,
    isSavingMinutes,
    isSendingEmail,
    actionToast,
    showActionToast,
    handleOpenMinutesEditor,
    handleSaveMinutesDraft,
    handleSubmitSendEmail,
    handleCopyRawTranscript,
    handleCopyRefinedTranscript,
  };
}
