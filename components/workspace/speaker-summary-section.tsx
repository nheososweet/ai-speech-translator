import type { SpeakerSummary } from "@/lib/types/meeting";

export function SpeakerSummarySection({
  speakerSummaries,
}: {
  speakerSummaries: SpeakerSummary[];
}) {
  return (
    <article className="rounded-lg border border-border/70 bg-background p-4">
      <h3 className="text-sm font-semibold text-foreground">
        Tóm tắt theo người nói
      </h3>
      <ul className="mt-3 space-y-3 overflow-auto xl:max-h-[52dvh]">
        {speakerSummaries.map((summary) => (
          <li
            key={summary.speaker}
            className="rounded-md border border-border/60 p-3 text-sm"
          >
            <p className="font-semibold text-foreground">{summary.speaker}</p>
            <ul className="mt-1 space-y-1 text-muted-foreground">
              {summary.keyPoints.map((point) => (
                <li key={point}>- {point}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </article>
  );
}
