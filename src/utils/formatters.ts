/**
 * Formate un volume d'octets en unités françaises lisibles (o, Ko, Mo, Go)
 * avec chiffres tabulaires cohérents.
 */
export function formatBytesFr(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 o';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  if (exponent === 0) return `${Math.round(value)} o`;
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[exponent]}`;
}

/**
 * Formate une durée en millisecondes vers une écriture française compacte.
 */
export function formatDurationFr(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0.0 s';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const totalSec = ms / 1000;
  if (totalSec < 60) return `${totalSec.toFixed(1)} s`;
  const mins = Math.floor(totalSec / 60);
  const secs = Math.round(totalSec % 60);
  return `${mins} min ${secs.toString().padStart(2, '0')} s`;
}
