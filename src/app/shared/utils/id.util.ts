const FALLBACK_ID_LENGTH = 8;

export function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `id_${Math.random().toString(36).slice(2, 2 + FALLBACK_ID_LENGTH)}`;
}
