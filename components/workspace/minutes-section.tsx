import { ArrowUpRightIcon, CheckCircle2Icon, LoaderCircleIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MinutesSectionProps {
  minutes: string;
  reportUrl?: string;
  isDialogOpen: boolean;
  onOpenChange: (open: boolean) => void;
  minutesDraft: string;
  onDraftChange: (draft: string) => void;
  minutesValidationError: string | null;
  isSaving: boolean;
  onSave: () => void;
  onOpenEditor: () => void;
}

export function MinutesSection({
  minutes,
  reportUrl,
  isDialogOpen,
  onOpenChange,
  minutesDraft,
  onDraftChange,
  minutesValidationError,
  isSaving,
  onSave,
  onOpenEditor,
}: MinutesSectionProps) {
  return (
    <div className="mt-4 rounded-lg border border-border/70 bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            Biên bản cuộc họp
          </h3>
          <p className="text-xs text-muted-foreground">
            Có thể xem nhanh, chỉnh sửa và lưu lại.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenEditor}
            >
              Xem/Sửa biên bản
            </Button>
          </DialogTrigger>
          <DialogContent
            showCloseButton={false}
            className="mb-4 flex h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col justify-between gap-0 overflow-hidden rounded-xl p-0 sm:max-w-none"
          >
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="px-6 pt-6 text-base">
                Biên bản cuộc họp
              </DialogTitle>
              <DialogDescription className="px-6 pb-3 text-xs">
                Chỉnh sửa trực tiếp rồi lưu lại, popup đang mở toàn màn hình.
              </DialogDescription>
              {reportUrl ? (
                <div className="px-6 pb-3">
                  <div className="flex items-center gap-2 rounded-md border border-emerald-200/50 bg-emerald-50 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                    <CheckCircle2Icon className="size-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
                        Biên bản đã lưu
                      </p>
                      <a
                        href={reportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-700 underline transition-colors hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                      >
                        <ArrowUpRightIcon className="size-3" />
                        Xem file biên bản
                      </a>
                    </div>
                  </div>
                </div>
              ) : null}
            </DialogHeader>

            <div className="min-h-0 flex-1 px-6 pb-6">
              <div className="space-y-2">
                <label
                  htmlFor="minutes-draft"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Nội dung biên bản
                </label>
                <textarea
                  id="minutes-draft"
                  value={minutesDraft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  disabled={isSaving}
                  rows={26}
                  className="min-h-[calc(100dvh-13rem)] w-full resize-none overflow-auto rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                {minutesValidationError ? (
                  <p className="text-xs text-rose-600 dark:text-rose-300">
                    {minutesValidationError}
                  </p>
                ) : null}
              </div>
            </div>

            <DialogFooter className="mx-0 mb-0 rounded-none border-t px-6 pb-6 pt-4 sm:justify-end">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving}>
                  Hủy
                </Button>
              </DialogClose>
              <Button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="gap-1.5"
              >
                {isSaving ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : null}
                Lưu biên bản
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="prose prose-sm mt-3 max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-td:text-muted-foreground prose-th:text-foreground dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{minutes}</ReactMarkdown>
      </div>
    </div>
  );
}
