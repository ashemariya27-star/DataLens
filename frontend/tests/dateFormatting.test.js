import assert from 'node:assert/strict';
import test from 'node:test';
import {
  combineDateTimeForApi,
  formatDate,
  formatDateInput,
  formatDateTime,
  formatDetectedDateText,
  formatExportDateValue,
  formatTime,
  parseDateInput,
  splitDateTimeForInput,
} from '../src/utils/dateFormatting.js';

test('date-only formatting is unambiguous for day and month values below 13', () => {
  assert.equal(formatDate('2026-11-12'), '12/11/2026');
  assert.equal(formatDate('2026-12-11'), '11/12/2026');
  assert.equal(formatDate('2026-12-21'), '21/12/2026');
});

test('date entry and edit prepopulation preserve the original ISO calendar day', () => {
  for (const [iso, display] of [
    ['2026-11-12', '12/11/2026'],
    ['2026-12-11', '11/12/2026'],
    ['2026-12-21', '21/12/2026'],
  ]) {
    assert.equal(formatDateInput(iso), display);
    assert.equal(parseDateInput(display), iso);
  }
});

test('date entry rejects impossible dates and accepts leap days', () => {
  assert.equal(parseDateInput('31/02/2026'), null);
  assert.equal(parseDateInput('29/02/2024'), '2024-02-29');
});

test('date-only formatting and parsing do not shift across time zones', () => {
  const previousTimezone = process.env.TZ;
  try {
    for (const timezone of ['America/Los_Angeles', 'Asia/Kolkata']) {
      process.env.TZ = timezone;
      assert.equal(formatDate('2026-11-12'), '12/11/2026');
      assert.equal(parseDateInput('12/11/2026'), '2026-11-12');
    }
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});

test('date-time and time displays use the agreed date and 12-hour formats', () => {
  assert.equal(formatDateTime('2026-11-12T10:30:00'), '12/11/2026, 10:30 AM');
  assert.equal(formatTime('16:05'), '4:05 PM');
  assert.equal(formatTime('00:00'), '12:00 AM');
});

test('analytics date-like values format only strict ISO date and timestamp text', () => {
  assert.equal(formatDetectedDateText('2026-11-12'), '12/11/2026');
  assert.equal(formatDetectedDateText('2026-11-12T10:30:00'), '12/11/2026, 10:30 AM');
  assert.equal(formatDetectedDateText('2026-11-12 is a code'), '2026-11-12 is a code');
});

test('date-time edit and save round trip preserves local calendar date and time', () => {
  const edited = splitDateTimeForInput('2026-11-12T10:30:00');
  assert.deepEqual(edited, { date: '12/11/2026', time: '10:30' });
  const saved = combineDateTimeForApi(edited.date, edited.time);
  assert.ok(saved);
  assert.deepEqual(splitDateTimeForInput(saved), edited);
});

test('academic export date and time columns use the same presentation format', () => {
  assert.equal(formatExportDateValue('due_date', '2026-12-21'), '21/12/2026');
  assert.equal(formatExportDateValue('updated_at', '2026-11-12T10:30:00'), '12/11/2026, 10:30 AM');
  assert.equal(formatExportDateValue('start_time', '16:05'), '4:05 PM');
});
