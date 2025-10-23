const SITE_URL = 'https://hallofgame.gleeze.com';

// Mensaje exacto solicitado
function buildShareText(points: number): string {
  return `He conseguido ${points} puntos en Break Rush\nA ver si consigues superarlo!!!\n${SITE_URL}`;
}

// Guard de reentrada para evitar dobles aperturas por eventos repetidos
let sharingInProgress = false;

export async function shareScore(points: number) {
  if (sharingInProgress) return;
  sharingInProgress = true;

  const text = buildShareText(points);

  try {
    // 1) Web Share API: mejor experiencia móvil. NO pasamos 'url' para no duplicar
    if (navigator.share) {
      await navigator.share({ title: 'Break Rush', text });
      return;
    }

    // 2) Fallback ÚNICO: WhatsApp web/app con solo el texto (incluye la URL en el propio texto)
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    const popup = window.open(wa, '_blank', 'noopener,noreferrer');

    if (!popup) {
      // 3) Si bloquea popups, copiamos al portapapeles y avisamos. No abrimos nada más.
      try {
        await navigator.clipboard.writeText(text);
        alert('Puntuación copiada al portapapeles. Pega el mensaje en tu app de mensajería.');
      } catch {
        // Último recurso: muestra un prompt para copiar manualmente
        prompt('Copia tu puntuación y compártela:', text);
      }
    }
  } finally {
    // pequeño retardo por si el navegador tarda en evaluar el popup blocker
    setTimeout(() => { sharingInProgress = false; }, 600);
  }
}
