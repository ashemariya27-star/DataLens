const DISPLAY_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/i;

function isValidDateParts(year, month, day) {
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= monthDays[month - 1];
}

function displayDateParts(year, month, day) {
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${String(year).padStart(4, '0')}`;
}

export function parseDateInput(value) {
  const match = DISPLAY_DATE_PATTERN.exec(String(value || '').trim());
  if (!match) return null;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  if (!isValidDateParts(year, month, day)) return null;
  return `${yearText}-${monthText}-${dayText}`;
}

export function formatDateInput(value) {
  const match = ISO_DATE_PATTERN.exec(String(value || ''));
  if (!match) return '';
  const [, yearText, monthText, dayText] = match;
  if (!isValidDateParts(Number(yearText), Number(monthText), Number(dayText))) return '';
  return displayDateParts(Number(yearText), Number(monthText), Number(dayText));
}

export function formatDate(value) {
  if (!value) return '—';
  const dateOnlyMatch = ISO_DATE_PATTERN.exec(String(value));
  if (dateOnlyMatch) return formatDateInput(value) || '—';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return displayDateParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function formatTime(value) {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(String(value || ''));
  if (!match) return value || '—';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return '—';
  const period = hour < 12 ? 'AM' : 'PM';
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function formatDateTime(value) {
  if (!value) return '—';
  if (ISO_DATE_PATTERN.test(String(value))) return formatDate(value);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${formatDate(date)}, ${time}`;
}

export function formatDetectedDateText(value) {
  if (typeof value !== 'string') return value;
  if (ISO_DATE_PATTERN.test(value)) {
    const formatted = formatDate(value);
    return formatted === '—' ? value : formatted;
  }
  if (ISO_DATE_TIME_PATTERN.test(value)) {
    const formatted = formatDateTime(value);
    return formatted === '—' ? value : formatted;
  }
  return value;
}

export function splitDateTimeForInput(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };
  return {
    date: displayDateParts(date.getFullYear(), date.getMonth() + 1, date.getDate()),
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  };
}

export function combineDateTimeForApi(dateValue, timeValue) {
  const isoDate = parseDateInput(dateValue);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(String(timeValue || ''));
  if (!isoDate || !timeMatch) return null;
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour > 23 || minute > 59) return null;

  const [year, month, day] = isoDate.split('-').map(Number);
  const localDate = new Date(0);
  localDate.setFullYear(year, month - 1, day);
  localDate.setHours(hour, minute, 0, 0);
  if (
    localDate.getFullYear() !== year
    || localDate.getMonth() !== month - 1
    || localDate.getDate() !== day
    || localDate.getHours() !== hour
    || localDate.getMinutes() !== minute
  ) return null;
  return localDate.toISOString();
}

export function formatExportDateValue(key, value) {
  if (value === null || value === undefined || value === '') return value;
  if (key.endsWith('_date')) return formatDate(value);
  if (key.endsWith('_at')) return formatDateTime(value);
  if (key.endsWith('_time')) return formatTime(value);
  return value;
}
