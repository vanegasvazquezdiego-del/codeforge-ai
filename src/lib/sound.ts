/**
 * Aviso sonoro al terminar una ejecucion. Oscilador muy corto y de gain bajo:
 * informa sin estorbar. Se genera en memoria, sin ficheros ni librerias.
 */
let ctx: AudioContext | null = null;

export function playResultTone(outcome: 'ok' | 'error') {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = outcome === 'ok' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(outcome === 'ok' ? 880 : 220, now);
    if (outcome === 'ok') osc.frequency.exponentialRampToValueAtTime(1180, now + 0.08);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  } catch {
    /* Autoplay bloqueado o sin dispositivo de audio: el aviso es opcional. */
  }
}