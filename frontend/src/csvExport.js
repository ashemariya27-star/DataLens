const NUMERIC_CSV_TEXT = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u;

export function spreadsheetSafeText(value) {
  const text = value === null || value === undefined
    ? ''
    : typeof value === 'object' ? JSON.stringify(value) : String(value);
  const leading = text.match(/^[\s\p{Cc}\p{Cf}]*/u)?.[0].length || 0;
  const candidate = text.slice(leading);
  const numericCandidate = candidate.replace(/[\s\p{Cc}\p{Cf}]+$/u, '');
  if (!/^[=+\-@]/u.test(candidate) || NUMERIC_CSV_TEXT.test(numericCandidate)) return text;
  return `'${text}`;
}

function csvField(value) {
  return `"${spreadsheetSafeText(value).replaceAll('"', '""')}"`;
}

export function serializeCsv(rows, columns) {
  const lines = [
    columns.map(({ label }) => csvField(label)).join(','),
    ...rows.map((row) => columns.map(({ key }) => csvField(row?.[key])).join(',')),
  ];
  return `\uFEFF${lines.join('\r\n')}`;
}
