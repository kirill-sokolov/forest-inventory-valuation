export interface CallExcerpt {
  id: number;
  speaker: string;
  text: string;
}

/** docs/spec.md §Task 3: every selectable quote is one unchanged, contiguous source fragment. */
export function createCallExcerpts(transcript: string): CallExcerpt[] {
  const excerpts: CallExcerpt[] = [];
  let speaker = "Nezināms";
  for (const line of transcript.split(/\r?\n/)) {
    speaker = /^\s*([^:\n]{1,40}):/u.exec(line)?.[1].trim() ?? speaker;
    let remaining = line.trim();
    while (remaining) {
      let end = Math.min(500, remaining.length);
      if (remaining.length > end) {
        const space = remaining.lastIndexOf(" ", end);
        if (space > 250) end = space;
      }
      excerpts.push({ id: excerpts.length + 1, speaker, text: remaining.slice(0, end).trim() });
      remaining = remaining.slice(end).trim();
    }
  }
  return excerpts;
}

export function resolveCallExcerpt(
  excerpts: readonly CallExcerpt[],
  id: number | null,
): string | null {
  if (id === null) return null;
  const excerpt = excerpts.find((item) => item.id === id);
  if (!excerpt) throw new Error("Unknown call evidence reference");
  return excerpt.text;
}
