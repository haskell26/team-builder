import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function loadStyles() {
  return readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
}

test('responsive layout keeps preview cards, editor boards, and overflow containers safe on mobile', async () => {
  const styles = await loadStyles();

  assert.match(styles, /body\s*\{[\s\S]*min-width:\s*320px;/);
  assert.match(styles, /\.button-row\s*\{[\s\S]*flex-wrap:\s*wrap;/);
  assert.match(styles, /\.role-tier-row\s*\{[\s\S]*flex-wrap:\s*wrap;/);
  assert.match(styles, /\.table-frame\s*\{[\s\S]*overflow-x:\s*auto;/);
  assert.match(styles, /\.sample-pre\s*\{[\s\S]*overflow-x:\s*auto;/);
  assert.match(styles, /@media \(max-width:\s*960px\)\s*\{[\s\S]*\.main-grid,[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(styles, /@media \(max-width:\s*960px\)\s*\{[\s\S]*\.candidate-list,[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(styles, /@media \(max-width:\s*960px\)\s*\{[\s\S]*\.candidate-compact-grid,[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(styles, /@media \(max-width:\s*960px\)\s*\{[\s\S]*\.editor-grid[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(styles, /@media \(max-width:\s*960px\)\s*\{[\s\S]*\.preference-controls[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(styles, /@media \(max-width:\s*640px\)\s*\{[\s\S]*\.page-shell\s*\{[\s\S]*width:\s*min\(100% - 20px,\s*1180px\);/);
});

test('layout text blocks and slot cards can shrink and wrap instead of forcing page overflow', async () => {
  const styles = await loadStyles();

  assert.match(styles, /\.page-shell,[\s\S]*\.editor-slot-button\s*\{[\s\S]*min-width:\s*0;/);
  assert.match(styles, /\.hero-title-row h1,[\s\S]*\.editor-guide\s*\{[\s\S]*overflow-wrap:\s*anywhere;/);
  assert.match(styles, /\.table-frame\s*\{[\s\S]*max-width:\s*100%;/);
  assert.match(styles, /\.sample-pre\s*\{[\s\S]*max-width:\s*100%;/);
});

test('tier color contract includes all eight required role-independent classes', async () => {
  const styles = await loadStyles();

  assert.match(styles, /--tier-unranked:\s*#ffffff;/);
  assert.match(styles, /\.tier-unranked\s*\{/);
  assert.match(styles, /\.tier-bronze\s*\{/);
  assert.match(styles, /\.tier-silver\s*\{/);
  assert.match(styles, /\.tier-gold\s*\{/);
  assert.match(styles, /\.tier-platinum\s*\{/);
  assert.match(styles, /\.tier-diamond\s*\{/);
  assert.match(styles, /\.tier-master\s*\{/);
  assert.match(styles, /\.tier-grandmaster\s*\{/);
});

test('preference and saved-player UI styles are present for the new workflow', async () => {
  const styles = await loadStyles();

  assert.match(styles, /\.saved-player-list(?:\s*,|\s*\{)/);
  assert.match(styles, /\.roster-list\s*\{/);
  assert.match(styles, /\.preference-control\s*\{/);
  assert.match(styles, /\.preference-badge-1\s*\{/);
  assert.match(styles, /\.preference-badge-2\s*\{/);
  assert.match(styles, /\.preference-badge-3\s*\{/);
});
