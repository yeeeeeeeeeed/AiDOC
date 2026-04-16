/**
 * 페이지 새로고침 후에도 업로드 상태를 유지하는 유틸리티
 * - job 메타데이터 (job_id, filename, page_count) → localStorage (24h TTL)
 * - 썸네일 (base64 배열) → sessionStorage (탭 닫으면 삭제, 새로고침은 유지)
 */

const TTL_MS = 24 * 60 * 60 * 1000;

interface SessionData {
  job_id: string;
  filename: string;
  page_count: number;
  saved_at: number;
}

export function saveSession(
  key: string,
  data: { job_id: string; filename: string; page_count: number }
) {
  try {
    const entry: SessionData = { ...data, saved_at: Date.now() };
    localStorage.setItem(`aidoc_${key}`, JSON.stringify(entry));
  } catch {}
}

export function loadSession(
  key: string
): { job_id: string; filename: string; page_count: number } | null {
  try {
    const raw = localStorage.getItem(`aidoc_${key}`);
    if (!raw) return null;
    const entry: SessionData = JSON.parse(raw);
    if (Date.now() - entry.saved_at > TTL_MS) {
      localStorage.removeItem(`aidoc_${key}`);
      return null;
    }
    return { job_id: entry.job_id, filename: entry.filename, page_count: entry.page_count };
  } catch {
    return null;
  }
}

export function clearSession(key: string) {
  try {
    localStorage.removeItem(`aidoc_${key}`);
    sessionStorage.removeItem(`aidoc_thumbs_${key}`);
  } catch {}
}

export function saveThumbs(key: string, thumbnails: string[]) {
  if (thumbnails.length === 0) return;
  try {
    sessionStorage.setItem(`aidoc_thumbs_${key}`, JSON.stringify(thumbnails));
  } catch {}
}

export function loadThumbs(key: string): string[] {
  try {
    const raw = sessionStorage.getItem(`aidoc_thumbs_${key}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
