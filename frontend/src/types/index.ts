export interface User {
  loginId: string;
  empId: string;
  deptName: string;
  deptCode: string;
  companyName: string;
  englishName: string;
  email: string;
}

export interface UploadResult {
  job_id: string;
  filename: string;
  page_count: number;
  thumbnails: string[]; // base64 PNG
}

export interface TableData {
  title: string;
  headers: string[];
  rows: string[][];
  page?: number;
}

export interface StepStatus {
  page: number;
  status: "pending" | "running" | "done" | "error";
  detail: string;
}

export interface StreamEvent {
  status: string;
  progress: number;
  steps?: StepStatus[];
  tables?: TableData[];
  content_pages?: Record<string, string>;
  translate_pages?: Record<string, string>;
  result?: string;
  error?: string;
  results?: ComparePageResult[];
}

export interface ComparePageResult {
  page: number;
  status: string;
  diff?: string;
  detail?: string;
}

export interface FileItem {
  fileName: string;
  realFileName: string;
  fullPath: string;
  fileSize: number;
}

export interface HistoryItem {
  user_id: string;
  menu: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface AccessCheck {
  is_allowed: boolean;
  is_admin: boolean;
  user_id: string;
  user_name: string;
}
