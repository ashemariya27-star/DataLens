import assert from 'node:assert/strict';
import test from 'node:test';
import { serializeCsv, spreadsheetSafeText } from '../src/csvExport.js';

test('formula-like prefixes are neutralized after whitespace and control characters', () => {
  for (const value of ['=SUM(A1)', '+1+2', '-cmd()', '@SUM(A1)', ' \t=1+1', '\u0000@SUM(A1)', '\u200b=1+1']) {
    assert.equal(spreadsheetSafeText(value), `'${value}`);
  }
});

test('legitimate negative and positive numeric text remains unchanged', () => {
  for (const value of ['-42', ' -42.75 ', '+4.2e3', '\t-1.5']) {
    assert.equal(spreadsheetSafeText(value), value);
  }
  assert.equal(spreadsheetSafeText(-42), '-42');
});

test('CSV serialization keeps quoting, commas, newlines, and embedded quotes intact', () => {
  const csv = serializeCsv(
    [{ name: '=1+1', description: 'comma, "quoted"\nline' }],
    [{ key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }],
  );
  assert.equal(csv, '\uFEFF"Name","Description"\r\n"\'=1+1","comma, ""quoted""\nline"');
});
