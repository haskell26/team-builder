import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildBalanceFromPlayers,
  parseMatchPlayersFromClipboard,
  refreshResultsFromPlayers,
  updateMatchPlayerPreferencePoints,
} from '../src/lib/appFlow.js';
import { PLAYER_STORE_KEY, saveCurrentPlayersToStore } from '../src/lib/playerStore.js';
import { loadMainIntoFakeDom } from '../testing/fakeDom.js';

async function loadSampleFixture() {
  return readFile(new URL('../src/fixtures/samplePlayers.tsv', import.meta.url), 'utf8');
}

function createSequenceRng(sequence) {
  let index = 0;

  return () => {
    const value = sequence[index % sequence.length];
    index += 1;
    return value;
  };
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
    removeItem(key) {
      store.delete(key);
    },
  };
}

async function createSavedPlayerPayload() {
  const sampleFixture = await loadSampleFixture();
  const parsed = parseMatchPlayersFromClipboard(sampleFixture);
  const players = updateMatchPlayerPreferencePoints(parsed.players, parsed.players[0].id, 'tank', 1);
  const storage = createMemoryStorage();

  saveCurrentPlayersToStore([], players, storage);
  return storage.getItem(PLAYER_STORE_KEY);
}

function expandSavedPanel(document) {
  document.querySelector('#saved-panel-toggle-button').click();
}

test('refreshResultsFromPlayers recalculates suggested candidates after extreme preference edits', async () => {
  const sampleFixture = await loadSampleFixture();
  const parsed = parseMatchPlayersFromClipboard(sampleFixture);
  const initialBalance = buildBalanceFromPlayers(parsed.players, {
    rng: createSequenceRng([0.15, 0.45, 0.75, 0.25, 0.55, 0.85]),
  });
  let preferredPlayers = parsed.players;
  const preferenceUpdates = [
    ['하늘방패', 'tank', 4],
    ['정조준', 'damage', 4],
    ['플랭크', 'damage', 4],
    ['빛의수호', 'support', 4],
    ['구원천사', 'support', 4],
    ['언랭복귀', 'tank', 4],
  ];

  for (const [playerId, role, delta] of preferenceUpdates) {
    preferredPlayers = updateMatchPlayerPreferencePoints(preferredPlayers, playerId, role, delta);
  }

  const refreshed = refreshResultsFromPlayers(initialBalance.candidates, initialBalance.editor, preferredPlayers, {
    rng: createSequenceRng([0.15, 0.45, 0.75, 0.25, 0.55, 0.85]),
  });

  assert.notDeepEqual(
    refreshed.candidates.map((candidate) => candidate.candidateKey),
    initialBalance.candidates.map((candidate) => candidate.candidateKey),
  );
  assert.equal(refreshed.selectedCandidateId, refreshed.editor?.candidateId ?? null);
  assert.equal(refreshed.candidateCount, initialBalance.candidateCount);
});

test('main entrypoint edits point preferences, saves the current roster, renders six candidates, and supports slot swapping', async (context) => {
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
  assert.match(savedPlayerPanel.innerHTML, /목록 펼치기/);
  assert.match(savedPlayerPanel.innerHTML, /보관함이 접혀 있습니다/);
  assert.doesNotMatch(savedPlayerPanel.innerHTML, /saved-player-list-scroll/);
  assert.match(previewPanel.innerHTML, /현재 매치 0명/);
  assert.match(resultPanel.innerHTML, /최종 편집 영역/);

  textarea.value = sampleFixture;
  textarea.dispatchEvent({ type: 'input' });

  assert.match(feedbackPanel.innerHTML, /입력 확인이 끝났습니다/);
  assert.match(previewPanel.innerHTML, /하늘방패/);
  assert.match(previewPanel.innerHTML, /preference-plus-0-tank/);
  assert.match(previewPanel.innerHTML, /선호 합계 6 \/ 6/);
  assert.match(previewPanel.innerHTML, /기본 2 \/ 2 \/ 2/);

  document.querySelector('#preference-plus-0-tank').click();

  assert.match(previewPanel.innerHTML, /직접 조정/);

  document.querySelector('#save-current-button').click();

  assert.match(savedPlayerPanel.innerHTML, /저장된 플레이어 10명/);
  assert.match(savedPlayerPanel.innerHTML, /선택 0 \/ 10/);
  assert.match(savedPlayerPanel.innerHTML, /보관함이 접혀 있습니다/);
  assert.doesNotMatch(savedPlayerPanel.innerHTML, /saved-player-list-scroll/);
  assert.match(localStorage.getItem(PLAYER_STORE_KEY), /"하늘방패"/);
  assert.match(localStorage.getItem(PLAYER_STORE_KEY), /"preferencePoints"/);

  expandSavedPanel(document);

  assert.match(savedPlayerPanel.innerHTML, /목록 접기/);
  assert.match(savedPlayerPanel.innerHTML, /saved-player-list-scroll/);
  assert.match(savedPlayerPanel.innerHTML, /탱 마스터 · 딜 실버 · 힐 골드 · 선호 3 \/ 1 \/ 2/);
  assert.match(savedPlayerPanel.innerHTML, /삭제/);

  balanceButton.click();

  assert.match(feedbackPanel.innerHTML, /계산이 끝났습니다/);
  assert.match(resultPanel.innerHTML, /추천 후보 6개/);
  assert.match(resultPanel.innerHTML, /선택 후보 1 편집/);
  assert.match(resultPanel.innerHTML, /id="candidate-button-6"/);
  assert.match(resultPanel.innerHTML, /candidate-card-selected/);
  assert.match(resultPanel.innerHTML, /mini-slot-card/);
  assert.match(resultPanel.innerHTML, /preference-badge/);
  assert.match(resultPanel.innerHTML, /3점\+|선호 2점|선호 3점/);
  assert.doesNotMatch(resultPanel.innerHTML, /팀 A 총점|팀 B 총점|점수 차이|역할군 차이 합|탱커 차이|언랭 분배 차이/);
  assert.equal(resultSection.scrolled, true);

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
  const sampleFixture = await loadSampleFixture();
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
  assert.match(savedPlayerPanel.innerHTML, /목록 펼치기/);
  assert.doesNotMatch(savedPlayerPanel.innerHTML, /saved-player-row-body-0/);
  assert.equal(document.querySelector('#load-selected-button').disabled, true);

  textarea.value = sampleFixture;
  textarea.dispatchEvent({ type: 'input' });
  balanceButton.click();
  assert.match(resultPanel.innerHTML, /추천 후보 6개/);

  expandSavedPanel(document);

  assert.match(savedPlayerPanel.innerHTML, /saved-player-list-scroll/);
  assert.match(savedPlayerPanel.innerHTML, /saved-player-row-body-0/);

  document.querySelector('#saved-player-row-body-0').click();

  assert.match(savedPlayerPanel.innerHTML, /선택 1 \/ 10/);
  assert.equal(document.querySelector('#load-selected-button').disabled, true);

  for (let index = 1; index < 10; index += 1) {
    document.querySelector(`#saved-player-row-body-${index}`).click();
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
});

test('saved-player rows toggle from the full hit area and delete stays isolated from selection state', async (context) => {
  const storedPayload = await createSavedPlayerPayload();
  const { document, cleanup } = await loadMainIntoFakeDom({
    storageEntries: {
      [PLAYER_STORE_KEY]: storedPayload,
    },
  });
  context.after(cleanup);

  const savedPlayerPanel = document.querySelector('#saved-player-panel');
  expandSavedPanel(document);

  assert.match(savedPlayerPanel.innerHTML, /id="saved-player-row-body-0"[\s\S]*class="saved-player-row-body"/);
  assert.match(savedPlayerPanel.innerHTML, /id="saved-player-delete-0"/);

  document.querySelector('#saved-player-row-body-0').click();

  assert.match(savedPlayerPanel.innerHTML, /선택 1 \/ 10/);
  assert.equal(document.querySelector('#load-selected-button').disabled, true);

  document.querySelector('#saved-player-delete-1').click();

  assert.match(savedPlayerPanel.innerHTML, /저장된 플레이어 9명/);
  assert.match(savedPlayerPanel.innerHTML, /선택 1 \/ 10/);
  assert.equal(document.querySelector('#load-selected-button').disabled, true);

  document.querySelector('#saved-player-row-body-0').click();

  assert.match(savedPlayerPanel.innerHTML, /선택 0 \/ 10/);

  document.querySelector('#clear-saved-button').click();

  assert.match(savedPlayerPanel.innerHTML, /저장된 플레이어 0명/);
  assert.match(savedPlayerPanel.innerHTML, /보관함이 접혀 있습니다|아직 저장된 플레이어가 없습니다/);
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
