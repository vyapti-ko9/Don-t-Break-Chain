// Share boundary - uses the Web Share API when available, otherwise copies to
// clipboard. Structured so "challenge a friend" / deep links can be added later.

export interface SharePayload {
  title: string;
  text: string;
  url?: string;
}

export async function shareResult(p: SharePayload): Promise<'shared' | 'copied' | 'unavailable'> {
  try {
    const nav = navigator as Navigator & { share?: (d: SharePayload) => Promise<void> };
    if (nav.share) {
      await nav.share(p);
      return 'shared';
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${p.text}${p.url ? ' ' + p.url : ''}`);
      return 'copied';
    }
  } catch {
    /* user cancelled or blocked */
  }
  return 'unavailable';
}

export function buildLevelShareText(levelId: number, timeSec: number, stars: number): SharePayload {
  return {
    title: "Don't Break the Chain",
    text: `I cleared level ${levelId} in ${timeSec.toFixed(2)}s with ${'★'.repeat(stars)}${'☆'.repeat(
      3 - stars,
    )} - can you beat it?`,
  };
}
