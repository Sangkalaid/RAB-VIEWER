/**
 * Formatting utilities following standard Indonesian construction conventions
 */

export function formatRupiah(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'Rp 0';
  }
  const rounded = Math.round(amount);
  const parts = Math.abs(rounded).toString().split('');
  let formatted = '';
  for (let i = 0; i < parts.length; i++) {
    if (i > 0 && (parts.length - i) % 3 === 0) {
      formatted += '.';
    }
    formatted += parts[i];
  }
  return `${amount < 0 ? '-Rp ' : 'Rp '}${formatted}`;
}

export function formatHargaSatuan(amount: number, unit: string): string {
  return `${formatRupiah(amount)} / ${unit}`;
}

export function formatKoefisien(val: number): string {
  if (val === undefined || val === null || isNaN(val)) {
    return '0,000';
  }
  // Convert to Indonesian comma format with appropriate decimal places (min 3, max 4)
  const str = val.toFixed(4);
  // Trim trailing zero if 4th is 0, keeping at least 3
  let trimmed = str;
  if (str.endsWith('0')) {
    trimmed = str.slice(0, -1);
  }
  return trimmed.replace('.', ',');
}

export function parseKoefisien(input: string): number {
  if (!input) return 0;
  const normalized = input.replace(',', '.').trim();
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

export function parseRupiahInput(input: string): number {
  if (!input) return 0;
  // Remove Rp, spaces, and thousand-separator dots
  const clean = input.replace(/Rp|\.|\s/g, '').replace(',', '.');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}
