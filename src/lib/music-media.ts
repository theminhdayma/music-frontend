const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const STEM_PRIORITY = ["vocal", "drums", "bass", "other"];

export interface PlaybackStem {
  id: string;
  type: string;
  fileUrl: string;
  active: boolean;
}

export function buildPlaybackUrl(songId: string, stemId?: string): string {
  const query = stemId ? `?stemId=${encodeURIComponent(stemId)}` : "";
  return `${API_URL}/music/songs/${songId}/playback${query}`;
}

export function normalizeStems<T extends { type: string }>(stems: T[]): T[] {
  const deduped = new Map<string, T>();

  for (const stem of stems) {
    const normalizedType = stem.type === "vocals" ? "vocal" : stem.type;
    deduped.set(normalizedType, {
      ...stem,
      type: normalizedType,
    });
  }

  return [...deduped.values()].sort((left, right) => {
    const leftIndex = STEM_PRIORITY.indexOf(left.type);
    const rightIndex = STEM_PRIORITY.indexOf(right.type);

    if (leftIndex === -1 && rightIndex === -1) {
      return left.type.localeCompare(right.type);
    }

    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });
}
