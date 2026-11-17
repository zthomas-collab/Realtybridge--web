// US (NANP) phone numbers. Stored as E.164 (+1XXXXXXXXXX), displayed as (XXX) XXX-XXXX.
// Area code and exchange can't start with 0 or 1 — matches the profiles.phone check constraint.

const NANP = /^([2-9]\d{2})([2-9]\d{2})(\d{4})$/;

function digitsOf(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits;
}

export function isValidUsPhone(input: string): boolean {
  return NANP.test(digitsOf(input));
}

/** Returns +1XXXXXXXXXX, or null if the input isn't a valid US number. */
export function toE164(input: string): string | null {
  const digits = digitsOf(input);
  return NANP.test(digits) ? `+1${digits}` : null;
}

export function formatUsPhone(input: string | null | undefined): string {
  if (!input) return "";
  const m = digitsOf(input).match(NANP);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : input;
}

/** Progressive formatting while the user types. */
export function formatPhoneAsYouType(input: string): string {
  const d = digitsOf(input).slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
