import { ChevronLeftIcon, Maximize2Icon } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TranscriptSegment } from "@/lib/types/meeting";
import { formatTimelineSecond, speakerToneClass } from "@/app/(main)/workspace/_lib/transcript-utils";

interface DiarizationSectionProps {
  segments: TranscriptSegment[];
  refinedSegments: TranscriptSegment[];
  speakerCount: number;
  shouldShowRefinedDiarization: boolean;
}

export function DiarizationSection({
  segments,
  refinedSegments,
  speakerCount,
  shouldShowRefinedDiarization,
}: DiarizationSectionProps) {
  return (
    <article className="rounded-lg border border-border/70 bg-linear-to-b from-background to-muted/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          Transcript theo người nói
        </h3>
        <div className="flex items-center gap-1">
          <span className="rounded-full border border-border/70 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {speakerCount} speaker
          </span>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Mở toàn màn hình transcript theo người nói"
                title="Mở toàn màn hình"
              >
                <Maximize2Icon className="size-4" />
              </Button>
            </DialogTrigger>

            <DialogContent
              showCloseButton={false}
              className="mb-4 flex h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col justify-between gap-0 rounded-xl p-0 sm:max-w-none"
            >
              <ScrollArea className="min-h-0 flex-1 overflow-hidden">
                <DialogHeader className="space-y-0 text-left">
                  <DialogTitle className="px-6 pt-6 text-base">
                    Transcript theo người nói
                  </DialogTitle>
                  <DialogDescription className="px-6 pb-3 text-xs">
                    Xem đầy đủ để đối sánh nội dung theo từng người nói.
                  </DialogDescription>
                </DialogHeader>

                <div
                  className={`grid gap-4 px-6 pb-6 ${
                    shouldShowRefinedDiarization ? "md:grid-cols-2" : "grid-cols-1"
                  }`}
                >
                  <section className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Bản gốc theo người nói
                    </p>
                    <ul className="space-y-2 overflow-auto pr-1 md:max-h-[55dvh]">
                      {segments.map((segment) => (
                        <li
                          key={`dialog-${segment.id}`}
                          className={`rounded-md border border-border/60 border-l-4 p-3 text-sm ${speakerToneClass(
                            segment.speaker,
                          )}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-xs font-semibold text-foreground">
                              {segment.speaker}
                            </span>
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {formatTimelineSecond(segment.startSecond)} -{" "}
                              {formatTimelineSecond(segment.endSecond)}
                            </span>
                          </div>
                          <p className="mt-2 leading-6 text-muted-foreground">
                            {segment.text}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </section>

                  {shouldShowRefinedDiarization ? (
                    <section className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Bản đã làm sạch theo người nói
                      </p>
                      <ul className="space-y-2 overflow-auto pr-1 md:max-h-[55dvh]">
                        {refinedSegments.map((segment) => (
                          <li
                            key={`dialog-refined-${segment.id}`}
                            className={`rounded-md border border-border/60 border-l-4 p-3 text-sm ${speakerToneClass(
                              segment.speaker,
                            )}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-xs font-semibold text-foreground">
                                {segment.speaker}
                              </span>
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {formatTimelineSecond(segment.startSecond)} -{" "}
                                {formatTimelineSecond(segment.endSecond)}
                              </span>
                            </div>
                            <p className="mt-2 leading-6 text-muted-foreground">
                              {segment.text}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              </ScrollArea>

              <DialogFooter className="mx-0 mb-0 rounded-none border-t px-6 pb-6 pt-4 sm:justify-end">
                <DialogClose asChild>
                  <Button variant="outline">
                    <ChevronLeftIcon className="size-4" />
                    Quay lại
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div
        className={`mt-3 grid gap-3 ${
          shouldShowRefinedDiarization ? "md:grid-cols-2" : "grid-cols-1"
        }`}
      >
        <section className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Bản gốc theo người nói
          </p>
          <ul className="space-y-2 overflow-auto pr-1 xl:max-h-[52dvh]">
            {segments.map((segment) => (
              <li
                key={segment.id}
                className={`rounded-md border border-border/60 border-l-4 p-3 text-sm ${speakerToneClass(
                  segment.speaker,
                )}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-xs font-semibold text-foreground">
                    {segment.speaker}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {formatTimelineSecond(segment.startSecond)} -{" "}
                    {formatTimelineSecond(segment.endSecond)}
                  </span>
                </div>
                <p className="mt-2 leading-6 text-muted-foreground">
                  {segment.text}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {shouldShowRefinedDiarization ? (
          <section className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Bản đã làm sạch theo người nói
            </p>
            <ul className="space-y-2 overflow-auto pr-1 xl:max-h-[52dvh]">
              {refinedSegments.map((segment) => (
                <li
                  key={`refined-${segment.id}`}
                  className={`rounded-md border border-border/60 border-l-4 p-3 text-sm ${speakerToneClass(
                    segment.speaker,
                  )}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-xs font-semibold text-foreground">
                      {segment.speaker}
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {formatTimelineSecond(segment.startSecond)} -{" "}
                      {formatTimelineSecond(segment.endSecond)}
                    </span>
                  </div>
                  <p className="mt-2 leading-6 text-muted-foreground">
                    {segment.text}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </article>
  );
}
