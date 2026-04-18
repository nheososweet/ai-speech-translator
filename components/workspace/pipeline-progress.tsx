import {
  CheckCircle2Icon,
  CircleDashedIcon,
  CircleIcon,
  XCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PipelineStep } from "@/app/(main)/workspace/_lib/workspace-types";

interface PipelineProgressProps {
  pipelineSteps: PipelineStep[];
  stageProgress: number;
  failedStepId: string | null;
  canRetryPipeline: boolean;
  onRetry: () => void;
}

export function PipelineProgress({
  pipelineSteps,
  stageProgress,
  failedStepId,
  canRetryPipeline,
  onRetry,
}: PipelineProgressProps) {
  return (
    <>
      <div className="mt-4 rounded-lg border border-border/70 bg-background p-3">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Tiến độ pipeline</span>
          <span>{stageProgress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${stageProgress}%` }}
          />
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-border/70 bg-background p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pipeline chi tiết
          </h3>
          {canRetryPipeline ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={onRetry}
            >
              Thử lại bước lỗi
            </Button>
          ) : null}
        </div>
        {failedStepId ? (
          <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-300">
            Đã phát hiện lỗi ở bước: {failedStepId}. Bạn có thể thử lại để chạy lại
            pipeline.
          </p>
        ) : null}
        <ul className="mt-3 space-y-2">
          {pipelineSteps.map((step) => {
            const statusMeta =
              step.status === "completed"
                ? {
                    icon: <CheckCircle2Icon className="size-4 text-emerald-600" />,
                    label: "Hoàn tất",
                  }
                : step.status === "running"
                  ? {
                      icon: (
                        <CircleDashedIcon className="size-4 animate-spin text-amber-600" />
                      ),
                      label: "Đang chạy",
                    }
                  : step.status === "error"
                    ? {
                        icon: <XCircleIcon className="size-4 text-rose-600" />,
                        label: "Lỗi",
                      }
                    : {
                        icon: <CircleIcon className="size-4 text-muted-foreground/60" />,
                        label: "Chờ",
                      };

            return (
              <li key={step.id} className="rounded-md border border-border/60 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {statusMeta.icon}
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${step.progress}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
