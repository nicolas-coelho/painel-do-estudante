/**
 * Utilitários de formatação de data no padrão brasileiro DD/MM/AAAA
 */

export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();

  // Se já for DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  // YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss...
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  // Tenta parse com Date se for formato legível
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch {
    // fallback
  }

  return str;
}

export function formatDateTimeBR(dateStr?: string | null): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();

  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
  if (match) {
    const [, year, month, day, hours, minutes] = match;
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  }

  return formatDateBR(str);
}

export function parseDateToISO(brOrIsoStr: string): string {
  if (!brOrIsoStr) return '';
  const str = brOrIsoStr.trim();

  // DD/MM/AAAA -> YYYY-MM-DD
  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return str;
}
