import type { StreamEvent } from "@/types";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "/aidoc-api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  uploadForm: async <T>(path: string, formData: FormData): Promise<T> => {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || res.statusText);
    }
    return res.json();
  },
};

export function createSSEConnection(
  path: string,
  onMessage: (data: StreamEvent) => void,
  onDone?: () => void,
  onError?: (err: string) => void
): EventSource {
  const url = `${BACKEND_URL}${path}`;
  const es = new EventSource(url, { withCredentials: true });

  es.onmessage = (event) => {
    try {
      const data: StreamEvent = JSON.parse(event.data);
      onMessage(data);
      if (data.status === "DONE" || data.status === "FAILED") {
        es.close();
        if (data.status === "DONE") onDone?.();
        if (data.status === "FAILED") onError?.(data.error || "처리 실패");
      }
    } catch {
      // ignore parse errors
    }
  };

  es.onerror = () => {
    es.close();
    onError?.("연결이 끊어졌습니다.");
  };

  return es;
}

export async function drmDownload(fileItem: {
  fullPath: string;
  fileName: string;
  fileSize: number;
}) {
  const tcmToken = document.cookie
    .split("; ")
    .find((c) => c.startsWith("AXI-TCM-TOKEN="))
    ?.split("=")[1];

  const param = JSON.stringify([
    {
      systemCode: "AXI",
      fileId: "",
      fileName: fileItem.fileName,
      realFileName: fileItem.fileName,
      fileSize: fileItem.fileSize,
      savePath: "",
      fullPath: fileItem.fullPath,
      accessToken: tcmToken || "",
      status: "COMPLETION",
      userInfo: "",
      aclCode: "",
      oEtc3: "",
      oEtc4: "",
      oEtc5: "",
      etcParam: "",
    },
  ]);

  const res = await fetch(
    `/proxy/dev/pecFm/fileCompressDownload?CD_DOWNLOAD_FILE_INFO=${encodeURIComponent(param)}`,
    { credentials: "include" }
  );

  if (!res.ok) throw new Error("DRM 다운로드 실패");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileItem.fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function drmUpload(
  file: File,
  savePath: string = "/axyard/aidoc/upload"
) {
  const tcmToken = document.cookie
    .split("; ")
    .find((c) => c.startsWith("AXI-TCM-TOKEN="))
    ?.split("=")[1];

  const timestamp = Date.now();
  const fd = new FormData();
  fd.append("CU_FILE", file, `${timestamp}_${file.name}`);
  fd.append("SYS_CD", "AXI");
  fd.append("SAVE_PATH", savePath);
  fd.append("accessToken", tcmToken || "");

  const res = await fetch("/proxy/dev/pecUpFm/fileUpload", {
    method: "POST",
    credentials: "include",
    body: fd,
  });

  if (!res.ok) throw new Error("DRM 업로드 실패");
  return res.json();
}

export default api;
