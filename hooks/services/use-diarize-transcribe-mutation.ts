import { useMutation } from "@tanstack/react-query";

import {
  diarizeAndTranscribe,
  type DiarizeTranscribeResponse,
} from "@/services/pipeline-records.service";

export function useDiarizeTranscribeMutation() {
  return useMutation<
    DiarizeTranscribeResponse,
    Error,
    {
      file: File;
      language?: string;
    }
  >({
    mutationFn: diarizeAndTranscribe,
  });
}
