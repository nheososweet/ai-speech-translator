import { useMutation } from "@tanstack/react-query";

import {
  generateSummaryAndMinutes,
  type SummaryAndMinutesResponse,
} from "@/services/pipeline-records.service";

export function useSummaryMinutesMutation() {
  return useMutation<
    SummaryAndMinutesResponse,
    Error,
    {
      transcriptLines: string[];
      model?: string;
    }
  >({
    mutationFn: generateSummaryAndMinutes,
  });
}
