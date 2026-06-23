/**
 * Date-only strings from Supabase (YYYY-MM-DD) must not be passed to
 * `new Date(string)` — JS treats them as UTC midnight, which shifts
 * back a day in US timezones (including Wyoming).
 */

export function parseLocalDateString(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;

  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

export function formatLocalDate(
  dateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }
): string {
  const date = parseLocalDateString(dateString);
  if (!date) return '';
  return date.toLocaleDateString('en-US', options);
}

export function formatAlbumDate(dateString: string | null | undefined): string {
  return formatLocalDate(dateString, { year: 'numeric', month: 'long' });
}

export function todayLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}