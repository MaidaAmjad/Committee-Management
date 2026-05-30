/** Normalize to E.164 (+digits only). */
export function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return `+${digits}`;
}

export function isValidE164(phone) {
  const n = normalizePhone(phone);
  return /^\+\d{8,15}$/.test(n);
}
