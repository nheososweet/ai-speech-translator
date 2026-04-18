import { useMutation } from "@tanstack/react-query";

import {
  updateReport,
  type UpdateReportResponse,
} from "@/services/pipeline-records.service";

export function useUpdateReportMutation() {
  return useMutation<
    UpdateReportResponse,
    Error,
    {
      id: number;
      textContent: string;
    }
  >({
    mutationFn: updateReport,
  });
}
