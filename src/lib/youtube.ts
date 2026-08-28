/** YouTube URL helpers. Handles watch, youtu.be, /embed/ and /shorts/ links. */

export function youTubeId(url: string | undefined | null): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/,
  );
  return m ? m[1] : null;
}

export function youTubeEmbedUrl(url: string): string | null {
  const id = youTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

/** A thumbnail image URL for a YouTube video (used as an auto film cover). */
export function youTubeThumbnail(url: string): string | null {
  const id = youTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
