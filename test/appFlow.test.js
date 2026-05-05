import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { parseMatchPlayersFromClipboard, updateMatchPlayerPreference } from '../src/lib/appFlow.js';
import { PLAYER_STORE_KEY, saveCurrentPlayersToStore } from '../src/lib/playerStore.js';
import { loadMainIntoFakeDom } from '../testing/fakeDom.js';

async function loadSampleFixture() {
  return readFile(new URL('../src/fixtures/samplePlayers.tsv', import.meta.url), 'utf8');
}

function createMemoryStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, `${value}`);
    },
  };
}

async function createSavedPlayerPayload() {
  const sampleFixture = await loadSampleFixture();
  const parsed = parseMatchPlayersFromClipboard(sampleFixture);
  const players = updateMatchPlayerPreference(parsed.players, parsed.players[0].id, 0, 'support');
  const storage = createMemoryStorage();

  saveCurrentPlayersToStore([], players, storage);
  return storage.getItem(PLAYER_STORE_KEY);
}

test('main entrypoint edits preferences, saves the current roster, renders six candidates, and supports slot swapping', async (context) => {
  const sampleFixture = await loadSampleFixture();
  const { document, localStorage, cleanup } = await loadMainIntoFakeDom();
  context.after(cleanup);

  const appRoot = document.querySelector('#app');
  const textarea = document.querySelector('#clipboard-input');
  const balanceButton = document.querySelector('#balance-button');
  const clearButton = document.querySelector('#clear-button');
  const feedbackPanel = document.querySelector('#feedback-panel');
  const previewPanel = document.querySelector('#preview-panel');
  const savedPlayerPanel = document.querySelector('#saved-player-panel');
  const resultPanel = document.querySelector('#result-content');
  const resultSection = document.querySelector('#result-panel');

  assert.ok(appRoot);
  assert.ok(textarea);
  assert.ok(balanceButton);
  assert.ok(clearButton);
  assert.match(feedbackPanel.innerHTML, /표를 붙여넣거나 저장된 플레이어 10명을 불러오면/);
  assert.match(savedPlayerPanel.innerHTML, /아직 저장된 플레이어가 없습니다/);
  assert.match(previewPanel.innerHTML, /현재 매치 0명/);
  assert.match(resultPanel.innerHTML, /최종 편집 영역/);

  textarea.value = sampleFixture;
  textarea.dispatchEvent({ type: 'input' });

  assert.match(feedbackPanel.innerHTML, /입력 확인이 끝났습니다/);
  assert.match(previewPanel.innerHTML, /하늘방패/);
  assert.match(previewPanel.innerHTML, /preference-select-0-0/);
  assert.match(previewPanel.innerHTML, /현재 10명 저장\/업데이트/);
  assert.equal(document.querySelector('#preference-select-0-0').value, 'tank');
  assert.equal(document.querySelector('#preference-select-0-1').value, 'support');
  assert.equal(document.querySelector('#preference-select-0-2').value, 'damage');

  const firstPreferenceSelect = document.querySelector('#preference-select-0-0');
  firstPreferenceSelect.value = 'support';
  firstPreferenceSelect.dispatchEvent({ type: 'change' });

  assert.equal(document.querySelector('#preference-select-0-0').value, 'support');
  assert.equal(document.querySelector('#preference-select-0-1').value, 'tank');
  assert.equal(document.querySelector('#preference-select-0-2').value, 'damage');

  document.querySelector('#save-current-button').click();

  assert.match(savedPlayerPanel.innerHTML, /저장된 플레이어 10명/);
  assert.match(savedPlayerPanel.innerHTML, /1순위 힐러/);
  assert.match(savedPlayerPanel.innerHTML, /하늘방패/);
  assert.match(localStorage.getItem(PLAYER_STORE_KEY), /"하늘방패"/);
  assert.match(localStorage.getItem(PLAYER_STORE_KEY), /"support","tank","damage"/);

  balanceButton.click();

  assert.match(feedbackPanel.innerHTML, /계산이 끝났습니다/);
  assert.match(resultPanel.innerHTML, /추천 후보 6개/);
  assert.match(resultPanel.innerHTML, /선택 후보 1 편집/);
  assert.match(resultPanel.innerHTML, /id="candidate-button-6"/);
  assert.match(resultPanel.innerHTML, /candidate-card-selected/);
  assert.match(resultPanel.innerHTML, /mini-slot-card/);
  assert.match(resultPanel.innerHTML, /preference-badge/);
  assert.match(resultPanel.innerHTML, /1순위/);
  assert.doesNotMatch(resultPanel.innerHTML, /팀 A 총점|팀 B 총점|점수 차이|역할군 차이 합|탱커 차이|언랭 분배 차이/);
  assert.equal(resultSection.scrolled, true);
  assert.deepEqual(resultSection.scrollArguments, [{ behavior: 'smooth', block: 'start' }]);

  const initialCandidateOneHtml = resultPanel.innerHTML;
  document.querySelector('#editor-slot-A-tank-1').click();

  assert.match(resultPanel.innerHTML, /editor-slot-selected/);
  assert.match(resultPanel.innerHTML, /팀 A 탱커 슬롯을 선택했습니다/);

  document.querySelector('#editor-slot-B-support-2').click();

  assert.match(resultPanel.innerHTML, /스왑이 적용되었습니다/);
  assert.doesNotMatch(resultPanel.innerHTML, /editor-slot-selected/);
  assert.notEqual(resultPanel.innerHTML, initialCandidateOneHtml);

  document.querySelector('#candidate-button-2').click();

  assert.equal(textarea.value, sampleFixture);
  assert.match(resultPanel.innerHTML, /선택 후보 2 편집/);
  assert.doesNotMatch(resultPanel.innerHTML, /스왑이 적용되었습니다/);

  clearButton.click();

  assert.equal(textarea.value, '');
  assert.match(feedbackPanel.innerHTML, /표를 붙여넣거나 저장된 플레이어 10명을 불러오면/);
  assert.match(previewPanel.innerHTML, /현재 매치 0명/);
  assert.match(resultPanel.innerHTML, /최종 편집 영역/);
});

test('saved-player selection is gated to exactly 10 and loading rewrites the textarea with canonical TSV', async (context) => {
  const storedPayload = await createSavedPlayerPayload();
  const { document, cleanup } = await loadMainIntoFakeDom({
    storageEntries: {
      [PLAYER_STORE_KEY]: storedPayload,
    },
  });
  context.after(cleanup);

  const textarea = document.querySelector('#clipboard-input');
  const balanceButton = document.querySelector('#balance-button');
  const feedbackPanel = document.querySelector('#feedback-panel');
  const previewPanel = document.querySelector('#preview-panel');
  const savedPlayerPanel = document.querySelector('#saved-player-panel');
  const resultPanel = document.querySelector('#result-content');

  assert.match(savedPlayerPanel.innerHTML, /저장된 플레이어 10명/);
  assert.match(savedPlayerPanel.innerHTML, /선택 0 \/ 10/);
  assert.equal(document.querySelector('#load-selected-button').disabled, true);

  const firstCheckbox = document.querySelector('#saved-player-checkbox-0');
  firstCheckbox.checked = true;
  firstCheckbox.dispatchEvent({ type: 'change' });

  assert.match(savedPlayerPanel.innerHTML, /선택 1 \/ 10/);
  assert.equal(document.querySelector('#load-selected-button').disabled, true);

  for (let index = 1; index < 10; index += 1) {
    const checkbox = document.querySelector(`#saved-player-checkbox-${index}`);
    checkbox.checked = true;
    checkbox.dispatchEvent({ type: 'change' });
  }

  assert.match(savedPlayerPanel.innerHTML, /선택 10 \/ 10/);
  assert.equal(document.querySelector('#load-selected-button').disabled, false);

  document.querySelector('#load-selected-button').click();

  assert.match(textarea.value, /^유저 이름\t탱커 티어\t딜러 티어\t힐러 티어/m);
  assert.equal(textarea.value.split('\n').length, 11);
  assert.match(feedbackPanel.innerHTML, /입력 확인이 끝났습니다/);
  assert.match(previewPanel.innerHTML, /하늘방패/);
  assert.match(previewPanel.innerHTML, /저장 불러옴/);
  assert.match(resultPanel.innerHTML, /최종 편집 영역/);

  balanceButton.click();

  assert.match(resultPanel.innerHTML, /추천 후보 6개/);
  assert.match(resultPanel.innerHTML, /preference-badge/);
});

test('main entrypoint blocks invalid clipboard data and keeps result empty', async (context) => {
  const { document, cleanup } = await loadMainIntoFakeDom();
  context.after(cleanup);

  const invalidClipboard = `유저 이름\t탱커 티어\t딜러 티어\t힐러 티어
중복닉\t골드\t골드\t골드
중복닉\t실버\t그마\tU`;
  const textarea = document.querySelector('#clipboard-input');
  const balanceButton = document.querySelector('#balance-button');
  const feedbackPanel = document.querySelector('#feedback-panel');
  const previewPanel = document.querySelector('#preview-panel');
  const resultPanel = document.querySelector('#result-content');
  const resultSection = document.querySelector('#result-panel');

  textarea.value = invalidClipboard;
  textarea.dispatchEvent({ type: 'input' });
  balanceButton.click();

  assert.match(feedbackPanel.innerHTML, /입력을 다시 확인해 주세요/);
  assert.match(feedbackPanel.innerHTML, /정확히 10명/);
  assert.match(feedbackPanel.innerHTML, /중복/);
  assert.match(previewPanel.innerHTML, /현재 매치 0명/);
  assert.match(resultPanel.innerHTML, /최종 편집 영역/);
  assert.equal(resultSection.scrolled, false);
});
