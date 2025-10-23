const SITE_URL = 'https://hallofgame.gleeze.com';

function buildShareText(points: number): string {
  // Usa saltos de línea. navigator.share respeta \n; enlaces usan %0A.
  return `Mi puntuación en Break Rush: ${points} pts\nSuperalo, si puedes !!\n${SITE_URL}`;
}

export async function shareScore(points: number) {
  const text = buildShareText(points);

  // Web Share API (mejor experiencia en móvil)
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Break Rush', text, url: SITE_URL });
      return;
    } catch {
      // cae al fallback
    }
  }

  // Fallback: intenta WhatsApp si el usuario lo abre
  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const tg = `https://t.me/share/url?url=${encodeURIComponent(SITE_URL)}&text=${encodeURIComponent(text)}`;

  // intenta abrir WhatsApp, si bloquea popups, deja el texto copiado
  const w = window.open(wa, '_blank');
  if (!w) {
    try {
      await navigator.clipboard.writeText(text);
      alert('Texto de puntuación copiado. Pégalo en tu app de mensajería.');
    } catch {
      // último fallback: abre Telegram
      window.open(tg, '_blank');
    }
  }
}
