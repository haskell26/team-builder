import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function loadStyles() {
  return readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
}

test('responsive layout keeps core sections stacked and overflow-contained on mobile', async () => {
  const styles = await loadStyles();

  assert.match(styles, /body\s*\{[\s\S]*min-width:\s*320px;/);
  assert.match(styles, /\.button-row\s*\{[\s\S]*flex-wrap:\s*wrap;/);
  assert.match(styles, /\.table-frame\s*\{[\s\S]*overflow-x:\s*auto;/);
  assert.match(styles, /\.sample-pre\s*\{[\s\S]*overflow-x:\s*auto;/);
  assert.match(styles, /@media \(max-width:\s*960px\)\s*\{[\s\S]*\.main-grid,[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(styles, /@media \(max-width:\s*960px\)\s*\{[\s\S]*\.teams-grid,[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(styles, /@media \(max-width:\s*960px\)\s*\{[\s\S]*\.result-summary[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(styles, /@media \(max-width:\s*640px\)\s*\{[\s\S]*\.page-shell\s*\{[\s\S]*width:\s*min\(100% - 20px,\s*1180px\);/);
});

test('layout text blocks are allowed to shrink and wrap instead of forcing page overflow', async () => {
  const styles = await loadStyles();

  assert.match(styles, /\.page-shell,[\s\S]*\.assignment-card\s*\{[\s\S]*min-width:\s*0;/);
  assert.match(styles, /\.hero-title-row h1,[\s\S]*\.preview-table td\s*\{[\s\S]*overflow-wrap:\s*anywhere;/);
  assert.match(styles, /\.table-frame\s*\{[\s\S]*max-width:\s*100%;/);
  assert.match(styles, /\.sample-pre\s*\{[\s\S]*max-width:\s*100%;/);
});
