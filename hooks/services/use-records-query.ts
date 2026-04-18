import { useQuery } from "@tanstack/react-query";

import {
  getRecords,
  type PipelineRecord,
} from "@/services/pipeline-records.service";

export function useRecordsQuery() {
  return useQuery<PipelineRecord[], Error>({
    queryKey: ["records"],
    queryFn: getRecords,
  });
}
