const SITE_URL = 'https://hallofgame.gleeze.com';

function buildShareText(points: number): string {
  return `He conseguido ${points} puntos en Break Rush\nA ver si consigues superarlo!!!\n${SITE_URL}`;
}

function isShareCancel(err: unknown): boolean {
  const e = err as any;
  const name = e?.name || '';
  const msg = (e?.message || '').toString().toLowerCase();
  return (
    name === 'AbortError' ||
    name === 'NotAllowedError' ||
    msg.includes('share canceled') ||
    msg.includes('canceled')
  );
}

let sharingInProgress = false;

export async function shareScore(points: number) {
  if (sharingInProgress) return;
  sharingInProgress = true;

  const text = buildShareText(points);

  try {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Break Rush', text });
      } catch (err) {
        if (isShareCancel(err)) {
          return;
        }
        const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(wa, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    const popup = window.open(wa, '_blank', 'noopener,noreferrer');
    if (!popup) {
      try {
        await navigator.clipboard.writeText(text);
        alert('Puntuación copiada al portapapeles.');
      } catch {
        prompt('Copia tu puntuación y compártela:', text);
      }
    }
  } finally {
    setTimeout(() => {
      sharingInProgress = false;
    }, 600);
  }
}
