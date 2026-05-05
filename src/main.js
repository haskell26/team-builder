import { SAMPLE_FIXTURE_TEXT } from './constants/copy.js';
import { optimizeTeams } from './lib/optimizer.js';
import { parseClipboard } from './lib/parseClipboard.js';
import { renderFeedback, renderPreview, renderResult, renderShell } from './lib/render.js';

const root = document.querySelector('#app');

const state = {
  clipboardText: '',
  errors: [],
  players: [],
  result: null,
};

root.innerHTML = renderShell();

const elements = {
  textarea: document.querySelector('#clipboard-input'),
  balanceButton: document.querySelector('#balance-button'),
  sampleButton: document.querySelector('#sample-button'),
  clearButton: document.querySelector('#clear-button'),
  feedbackPanel: document.querySelector('#feedback-panel'),
  previewPanel: document.querySelector('#preview-panel'),
  resultPanel: document.querySelector('#result-content'),
};

function updatePanels() {
  elements.feedbackPanel.innerHTML = renderFeedback(
    state.errors,
    Boolean(state.clipboardText.trim()),
    state.players.length > 0,
    Boolean(state.result),
  );
  elements.previewPanel.innerHTML = renderPreview(state.players);
  elements.resultPanel.innerHTML = renderResult(state.result);
}

function syncPreview() {
  if (!state.clipboardText.trim()) {
    state.errors = [];
    state.players = [];
    return;
  }

  const parsed = parseClipboard(state.clipboardText);
  state.errors = parsed.errors;
  state.players = parsed.errors.length > 0 ? [] : parsed.players;
}

function handleInputChange(nextValue) {
  state.clipboardText = nextValue;
  state.result = null;
  syncPreview();
  updatePanels();
}

function handleBalance() {
  syncPreview();

  if (state.errors.length > 0 || state.players.length === 0) {
    state.result = null;
    updatePanels();
    return;
  }

  state.result = optimizeTeams(state.players);
  updatePanels();
  document.querySelector('#result-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function loadSampleFixture() {
  elements.textarea.value = SAMPLE_FIXTURE_TEXT;
  handleInputChange(SAMPLE_FIXTURE_TEXT);
}

function clearAll() {
  state.clipboardText = '';
  state.errors = [];
  state.players = [];
  state.result = null;
  elements.textarea.value = '';
  updatePanels();
}

elements.textarea.addEventListener('input', (event) => {
  handleInputChange(event.currentTarget.value);
});
elements.balanceButton.addEventListener('click', handleBalance);
elements.sampleButton.addEventListener('click', loadSampleFixture);
elements.clearButton.addEventListener('click', clearAll);

updatePanels();
