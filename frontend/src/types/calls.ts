export type CallStatus = "in_progress" | "success" | "failed";

export interface Call {
  id: string;
  phone_number: string;
  caller_name: string | null;
  duration_seconds: number | null;
  status: CallStatus;
  summary: string | null;
  label: string | null;
  notes: string | null; // TASK 1: added the notes field for annotation of the call
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  raw_transcript: string | null;
}

export interface CallCounts {
  in_progress: number;
  success: number;
  failed: number;
}

export interface PaginatedCallsResponse {
  data: Call[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  counts: CallCounts;
}

// This is for the sorting of the calls based on the provided query parameters in TASK 2
export type SortOrder = "asc" | "desc";
// This is for the sorting of the calls based on the provided query parameters in TASK 2
export type SortCallsBy = 
  | "created_at"
  | "started_at"
  |"duration_seconds"
  | "caller_name"
  | "phone_number"
  | "status"
  | "label";
export interface CallsQueryParams {
  status?: CallStatus;
  caller_name?: string; //TASK 2: added fields  for filtering
  phone_number?: string;
  label?: string;
  min_duration_seconds?: number;
  max_duration_seconds?: number;
  sort_by?: SortCallsBy;
  sort_order?: SortOrder;
  page?: number;
  page_size?: number;
}
