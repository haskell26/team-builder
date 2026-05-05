import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { loadMainIntoFakeDom } from '../testing/fakeDom.js';

async function loadSampleFixture() {
  return readFile(new URL('../src/fixtures/samplePlayers.tsv', import.meta.url), 'utf8');
}

test('main entrypoint wires paste, balance, and reset interactions through the DOM', async (context) => {
  const sampleFixture = await loadSampleFixture();
  const { document, cleanup } = await loadMainIntoFakeDom();
  context.after(cleanup);

  const textarea = document.querySelector('#clipboard-input');
  const balanceButton = document.querySelector('#balance-button');
  const clearButton = document.querySelector('#clear-button');
  const feedbackPanel = document.querySelector('#feedback-panel');
  const previewPanel = document.querySelector('#preview-panel');
  const resultPanel = document.querySelector('#result-content');
  const resultSection = document.querySelector('#result-panel');

  assert.ok(textarea);
  assert.ok(balanceButton);
  assert.ok(clearButton);
  assert.match(feedbackPanel.innerHTML, /표를 붙여넣으면 바로 검증 결과와 미리보기가 표시됩니다/);
  assert.match(previewPanel.innerHTML, /입력한 내용이 유효하면/);
  assert.match(resultPanel.innerHTML, /유효한 10명 데이터를/);

  textarea.value = sampleFixture;
  textarea.dispatchEvent({ type: 'input' });

  assert.match(feedbackPanel.innerHTML, /입력 확인이 끝났습니다/);
  assert.match(previewPanel.innerHTML, /하늘방패/);
  assert.match(previewPanel.innerHTML, /그랜드마스터/);

  balanceButton.click();

  assert.match(feedbackPanel.innerHTML, /검증이 완료되었습니다/);
  assert.match(resultPanel.innerHTML, /점수 차이/);
  assert.match(resultPanel.innerHTML, /1팀/);
  assert.match(resultPanel.innerHTML, /2팀/);
  assert.equal(resultSection.scrolled, true);
  assert.deepEqual(resultSection.scrollArguments, [{ behavior: 'smooth', block: 'start' }]);

  clearButton.click();

  assert.equal(textarea.value, '');
  assert.match(feedbackPanel.innerHTML, /표를 붙여넣으면 바로 검증 결과와 미리보기가 표시됩니다/);
  assert.match(previewPanel.innerHTML, /입력한 내용이 유효하면/);
  assert.match(resultPanel.innerHTML, /유효한 10명 데이터를/);
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
  assert.match(resultPanel.innerHTML, /유효한 10명 데이터를/);
  assert.equal(resultSection.scrolled, false);
});
