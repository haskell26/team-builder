import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function loadStyles() {
  return readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
}

test('responsive layout keeps dense current-player rows, candidate boards, and overflow containers safe on mobile', async () => {
  const styles = await loadStyles();

  assert.match(styles, /body\s*\{[\s\S]*min-width:\s*320px;/);
  assert.match(styles, /\.workspace-stack,\s*\.workspace-sidebar\s*\{[\s\S]*display:\s*grid;[\s\S]*gap:\s*20px;/);
  assert.match(styles, /\.button-row\s*\{[\s\S]*flex-wrap:\s*wrap;/);
  assert.match(styles, /\.role-tier-row\s*\{[\s\S]*flex-wrap:\s*wrap;/);
  assert.match(styles, /\.table-frame\s*\{[\s\S]*overflow-x:\s*auto;/);
  assert.match(styles, /\.sample-pre\s*\{[\s\S]*overflow-x:\s*auto;/);
  assert.match(styles, /\.current-player-list-scroll\s*\{[\s\S]*max-height:\s*540px;[\s\S]*overflow-y:\s*auto;/);
  assert.match(
    styles,
    /\.current-player-row\s*\{[\s\S]*display:\s*grid;[\s\S]*grid-template-columns:\s*minmax\(0,\s*1\.35fr\)\s*minmax\(320px,\s*1fr\);/,
  );
  assert.match(styles, /@media \(max-width:\s*960px\)\s*\{[\s\S]*\.main-grid,[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(styles, /@media \(max-width:\s*960px\)\s*\{[\s\S]*\.candidate-list,[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(styles, /@media \(max-width:\s*960px\)\s*\{[\s\S]*\.candidate-compact-grid,[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(styles, /@media \(max-width:\s*960px\)\s*\{[\s\S]*\.editor-grid[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(styles, /@media \(max-width:\s*960px\)\s*\{[\s\S]*\.current-player-row[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(
    styles,
    /@media \(max-width:\s*960px\)\s*\{[\s\S]*\.current-player-preferences[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/,
  );
  assert.match(styles, /@media \(max-width:\s*640px\)\s*\{[\s\S]*\.current-player-preferences[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(styles, /@media \(max-width:\s*640px\)\s*\{[\s\S]*\.page-shell\s*\{[\s\S]*width:\s*min\(100% - 20px,\s*1180px\);/);
});

test('layout text blocks and slot cards can shrink and wrap instead of forcing page overflow', async () => {
  const styles = await loadStyles();

  assert.match(styles, /\.page-shell,[\s\S]*\.editor-slot-button\s*\{[\s\S]*min-width:\s*0;/);
  assert.match(styles, /\.hero-title-row h1,[\s\S]*\.editor-guide\s*\{[\s\S]*overflow-wrap:\s*anywhere;/);
  assert.match(styles, /\.saved-player-summary\s*\{[\s\S]*white-space:\s*nowrap;[\s\S]*overflow:\s*hidden;[\s\S]*text-overflow:\s*ellipsis;/);
  assert.match(styles, /\.current-player-name\s*\{[\s\S]*white-space:\s*nowrap;[\s\S]*overflow:\s*hidden;[\s\S]*text-overflow:\s*ellipsis;/);
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

test('saved-player sidebar styles cover the collapsed panel, scrollable list, and compact row hit area', async () => {
  const styles = await loadStyles();

  assert.match(styles, /\.saved-panel-shell\s*\{/);
  assert.match(styles, /\.saved-panel-header,\s*\.saved-toolbar,\s*\.preview-toolbar\s*\{/);
  assert.match(styles, /\.saved-panel-summary\s*\{/);
  assert.match(styles, /\.saved-player-list-scroll\s*\{[\s\S]*max-height:\s*420px;[\s\S]*overflow-y:\s*auto;/);
  assert.match(styles, /\.saved-player-row\s*\{[\s\S]*display:\s*grid;[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto;/);
  assert.match(styles, /\.saved-player-row-body\s*\{[\s\S]*width:\s*100%;[\s\S]*display:\s*flex;[\s\S]*align-items:\s*center;/);
  assert.match(styles, /\.saved-player-row-selected\s*\{/);
  assert.match(styles, /\.saved-toolbar-actions\s*\{/);
  assert.doesNotMatch(styles, /@media \(max-width:\s*960px\)\s*\{[\s\S]*\.saved-player-row\s*\{[\s\S]*flex-direction:\s*column;/);
});

test('dense current-player editing and result controls remain styled after the round-5 refactor', async () => {
  const styles = await loadStyles();

  assert.match(styles, /\.current-player-list\s*\{/);
  assert.match(styles, /\.current-player-preferences\s*\{/);
  assert.match(styles, /\.preference-stepper\s*\{/);
  assert.match(styles, /\.preference-stepper-compact\s*\{/);
  assert.match(styles, /\.stepper-button\s*\{/);
  assert.match(styles, /\.stepper-button-compact\s*\{/);
  assert.match(styles, /\.result-toolbar\s*\{/);
  assert.match(styles, /\.inline-link\s*\{/);
  assert.match(styles, /\.danger-button\s*\{/);
  assert.match(styles, /\.preference-badge-0\s*\{/);
  assert.match(styles, /\.preference-badge-1\s*\{/);
  assert.match(styles, /\.preference-badge-2\s*\{/);
  assert.match(styles, /\.preference-badge-3\s*\{/);
  assert.match(styles, /\.preference-badge-6\s*\{/);
});
