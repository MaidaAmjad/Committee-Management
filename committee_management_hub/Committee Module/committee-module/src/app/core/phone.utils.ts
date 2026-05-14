/** Build E.164 from country calling code (digits only) + national subscriber digits. */
export function buildE164(countryDialDigits: string, nationalDigits: string): string {
  const cc = countryDialDigits.replace(/\D/g, '');
  const ns = nationalDigits.replace(/\D/g, '');
  if (!cc || !ns) return '';
  return `+${cc}${ns}`;
}

/** ITU-T E.164: total digits (country + national) 8–15 inclusive, leading +. */
export function isPlausibleE164(value: string | null | undefined): boolean {
  if (value == null) return false;
  const t = value.trim();
  if (!t.startsWith('+')) return false;
  const digits = t.slice(1).replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

/** Digits for wa.me/{digits} from stored phone (prefer E.164 +…). */
export function normalizeWhatsAppDigits(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  let digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('03')) {
    digits = `92${digits.slice(1)}`;
  }
  if (digits.length >= 8 && digits.length <= 15) return digits;
  return null;
}
