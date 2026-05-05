import { SAMPLE_FIXTURE_TEXT } from './constants/copy.js';
import { buildBalanceFromClipboard, getSelectedCandidateResult } from './lib/appFlow.js';
import { parseClipboard } from './lib/parseClipboard.js';
import { renderFeedback, renderPreview, renderResult, renderShell } from './lib/render.js';

const root = document.querySelector('#app');

const state = {
  clipboardText: '',
  errors: [],
  players: [],
  candidates: [],
  candidateCount: 0,
  selectedCandidateId: null,
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
  updateInputPanels();
  updateResultPanel();
}

function updateInputPanels() {
  elements.feedbackPanel.innerHTML = renderFeedback(
    state.errors,
    Boolean(state.clipboardText.trim()),
    state.players.length > 0,
    Boolean(state.result),
  );
  elements.previewPanel.innerHTML = renderPreview(state.players);
}

function bindCandidateButtons() {
  state.candidates.forEach((candidate, index) => {
    document.querySelector(`#candidate-button-${index + 1}`)?.addEventListener('click', () => {
      handleCandidateSelection(candidate.id);
    });
  });
}

function updateResultPanel() {
  elements.resultPanel.innerHTML = renderResult(state.result, state.candidates, state.selectedCandidateId);
  bindCandidateButtons();
}

function syncPreview() {
  if (!state.clipboardText.trim()) {
    state.errors = [];
    state.players = [];
    state.candidates = [];
    state.candidateCount = 0;
    state.selectedCandidateId = null;
    return;
  }

  const parsed = parseClipboard(state.clipboardText);
  state.errors = parsed.errors;
  state.players = parsed.errors.length > 0 ? [] : parsed.players;
}

function handleInputChange(nextValue) {
  state.clipboardText = nextValue;
  state.candidates = [];
  state.candidateCount = 0;
  state.selectedCandidateId = null;
  state.result = null;
  syncPreview();
  updatePanels();
}

function handleBalance() {
  syncPreview();

  if (state.errors.length > 0 || state.players.length === 0) {
    state.candidates = [];
    state.candidateCount = 0;
    state.selectedCandidateId = null;
    state.result = null;
    updatePanels();
    return;
  }

  const balance = buildBalanceFromClipboard(state.clipboardText);
  state.errors = balance.errors;
  state.players = balance.players;
  state.candidates = balance.candidates;
  state.candidateCount = balance.candidateCount;
  state.selectedCandidateId = balance.selectedCandidateId;
  state.result = balance.result;
  updatePanels();
  document.querySelector('#result-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleCandidateSelection(candidateId) {
  if (!candidateId || candidateId === state.selectedCandidateId) {
    return;
  }

  state.selectedCandidateId = candidateId;
  state.result = getSelectedCandidateResult(state.candidates, candidateId, state.candidateCount);
  updateResultPanel();
}

function loadSampleFixture() {
  elements.textarea.value = SAMPLE_FIXTURE_TEXT;
  handleInputChange(SAMPLE_FIXTURE_TEXT);
}

function clearAll() {
  state.clipboardText = '';
  state.errors = [];
  state.players = [];
  state.candidates = [];
  state.candidateCount = 0;
  state.selectedCandidateId = null;
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
