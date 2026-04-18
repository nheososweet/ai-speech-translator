export type PipelineStepStatus = "pending" | "running" | "completed" | "error";

export type PipelineStep = {
  id: "raw_transcript" | "diarization" | "speaker_summary" | "minutes";
  title: string;
  description: string;
  status: PipelineStepStatus;
  progress: number;
};
