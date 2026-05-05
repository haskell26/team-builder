import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { loadMainIntoFakeDom } from '../testing/fakeDom.js';

async function loadSampleFixture() {
  return readFile(new URL('../src/fixtures/samplePlayers.tsv', import.meta.url), 'utf8');
}

test('main entrypoint renders six compact candidates, hides score labels, and supports slot swapping', async (context) => {
  const sampleFixture = await loadSampleFixture();
  const { document, cleanup } = await loadMainIntoFakeDom();
  context.after(cleanup);

  const appRoot = document.querySelector('#app');
  const textarea = document.querySelector('#clipboard-input');
  const balanceButton = document.querySelector('#balance-button');
  const clearButton = document.querySelector('#clear-button');
  const feedbackPanel = document.querySelector('#feedback-panel');
  const previewPanel = document.querySelector('#preview-panel');
  const resultPanel = document.querySelector('#result-content');
  const resultSection = document.querySelector('#result-panel');

  assert.ok(appRoot);
  assert.ok(textarea);
  assert.ok(balanceButton);
  assert.ok(clearButton);
  assert.doesNotMatch(appRoot.innerHTML, /compact preview/);
  assert.match(feedbackPanel.innerHTML, /표를 붙여넣으면 바로 검증 결과와 미리보기가 표시됩니다/);
  assert.match(previewPanel.innerHTML, /입력한 내용이 유효하면/);
  assert.match(resultPanel.innerHTML, /최종 편집 영역/);

  textarea.value = sampleFixture;
  textarea.dispatchEvent({ type: 'input' });

  assert.match(feedbackPanel.innerHTML, /입력 확인이 끝났습니다/);
  assert.match(previewPanel.innerHTML, /하늘방패/);
  assert.match(previewPanel.innerHTML, /그랜드마스터/);
  assert.doesNotMatch(previewPanel.innerHTML, /0점|1점|2점|3점|4점|5점|6점|7점/);

  balanceButton.click();

  assert.match(feedbackPanel.innerHTML, /계산이 끝났습니다/);
  assert.match(resultPanel.innerHTML, /추천 후보 6개/);
  assert.match(resultPanel.innerHTML, /선택 후보 1 편집/);
  assert.match(resultPanel.innerHTML, /id="candidate-button-6"/);
  assert.match(resultPanel.innerHTML, /candidate-card-selected/);
  assert.match(resultPanel.innerHTML, /mini-slot-card/);
  assert.match(resultPanel.innerHTML, /id="editor-slot-A-tank-1"/);
  assert.match(resultPanel.innerHTML, /id="editor-slot-B-support-2"/);
  assert.match(resultPanel.innerHTML, /최종 편집/);
  assert.doesNotMatch(resultPanel.innerHTML, /팀 A 총점|팀 B 총점|점수 차이|역할군 차이 합|탱커 차이|언랭 분배 차이/);
  assert.doesNotMatch(resultPanel.innerHTML, /Final Edit|TANK|DPS|SUP/);
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

  const candidateTwoButton = document.querySelector('#candidate-button-2');
  assert.ok(candidateTwoButton);
  candidateTwoButton.click();

  assert.equal(textarea.value, sampleFixture);
  assert.match(resultPanel.innerHTML, /선택 후보 2 편집/);
  assert.match(resultPanel.innerHTML, /후보 카드를 누르면 언제든 새로 불러오며/);
  assert.doesNotMatch(resultPanel.innerHTML, /스왑이 적용되었습니다/);

  const candidateOneButton = document.querySelector('#candidate-button-1');
  assert.ok(candidateOneButton);
  candidateOneButton.click();

  assert.match(resultPanel.innerHTML, /선택 후보 1 편집/);
  assert.equal(resultPanel.innerHTML, initialCandidateOneHtml);

  clearButton.click();

  assert.equal(textarea.value, '');
  assert.match(feedbackPanel.innerHTML, /표를 붙여넣으면 바로 검증 결과와 미리보기가 표시됩니다/);
  assert.match(previewPanel.innerHTML, /입력한 내용이 유효하면/);
  assert.match(resultPanel.innerHTML, /최종 편집 영역/);
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
  assert.match(previewPanel.innerHTML, /입력한 내용이 유효하면/);
  assert.match(resultPanel.innerHTML, /최종 편집 영역/);
  assert.equal(resultSection.scrolled, false);
});
