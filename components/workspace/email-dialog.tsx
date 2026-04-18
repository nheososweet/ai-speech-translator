import { ArrowUpRightIcon, InfoIcon, LoaderCircleIcon } from "lucide-react";
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

interface EmailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  canSendEmail: boolean;
  reportUrl?: string;
  recipientsInput: string;
  onRecipientsChange: (input: string) => void;
  validationError: string | null;
  isSending: boolean;
  onSubmit: () => void;
}

export function EmailDialog({
  isOpen,
  onOpenChange,
  canSendEmail,
  reportUrl,
  recipientsInput,
  onRecipientsChange,
  validationError,
  isSending,
  onSubmit,
}: EmailDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <div className="inline-flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            className="gap-1.5"
            disabled={!canSendEmail}
          >
            Gửi email
            <ArrowUpRightIcon className="size-4" />
          </Button>
          {!canSendEmail ? (
            <div className="group relative">
              <InfoIcon className="size-4 text-muted-foreground" />
              <div className="pointer-events-none absolute right-0 top-5 z-10 hidden w-64 rounded-md border border-border/70 bg-popover px-2 py-1.5 text-[11px] leading-4 text-popover-foreground shadow-md group-hover:block">
                Vui lòng xem, chỉnh sửa và lưu biên bản để gửi email.
              </div>
            </div>
          ) : null}
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gửi email biên bản</DialogTitle>
          <DialogDescription>
            Nhập danh sách email, cách nhau bởi dấu phẩy hoặc xuống dòng.
          </DialogDescription>
        </DialogHeader>

        {reportUrl ? (
          <div className="min-w-0 space-y-1 rounded-md border border-border/70 bg-muted/30 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">
              URL file biên bản
            </p>
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted-foreground transition-colors hover:text-primary hover:underline hover:underline-offset-2"
              title={reportUrl}
            >
              {reportUrl}
            </a>
          </div>
        ) : null}

        <div className="space-y-2">
          <label
            htmlFor="email-recipients"
            className="text-xs font-medium text-muted-foreground"
          >
            Danh sách người nhận
          </label>
          <textarea
            id="email-recipients"
            value={recipientsInput}
            onChange={(event) => onRecipientsChange(event.target.value)}
            placeholder={"a@company.vn, b@company.vn\nleader@company.vn"}
            rows={5}
            disabled={isSending}
            className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {validationError ? (
            <p className="text-xs text-rose-600 dark:text-rose-300">
              {validationError}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSending}>
              Hủy
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSending}
            className="gap-1.5"
          >
            {isSending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : null}
            Xác nhận gửi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
