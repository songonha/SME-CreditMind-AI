export const POS_CAPTURES_STORAGE_KEY = "creditmind-assets";

export type PosCaptureRecord = {
  id: string;
  createdAt: string;
  mimeType: string;
  base64Data: string;
  /** Stable display name for lists and assessment (added for new saves; derived for legacy rows). */
  fileName?: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Extension from MIME type for generated file names. */
export function extensionFromMime(mimeType: string): string {
  const m = mimeType.toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  return "png";
}

/** New human-readable file name for a capture (unique per save). */
export function generatePosCaptureFileName(mimeType: string): string {
  const ext = extensionFromMime(mimeType);
  const t = new Date();
  const stamp = `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}_${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}`;
  const rnd = Math.random().toString(36).slice(2, 8);
  return `POS_capture_${stamp}_${rnd}.${ext}`;
}

/** File name for UI and assessment (persisted or synthesized for legacy data). */
export function getCaptureFileName(c: PosCaptureRecord): string {
  if (c.fileName?.trim()) {
    return c.fileName.trim();
  }
  const ext = extensionFromMime(c.mimeType);
  const iso = c.createdAt.replace(/[:.]/g, "-").slice(0, 19);
  return `POS_capture_${iso}_${c.id.slice(0, 8)}.${ext}`;
}

export function loadPosCapturesFromStorage(): PosCaptureRecord[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(POS_CAPTURES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as PosCaptureRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
