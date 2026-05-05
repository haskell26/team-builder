import { SAMPLE_FIXTURE_TEXT } from './constants/copy.js';
import { applySlotSelection, buildBalanceFromClipboard, getEditorGuideText, selectCandidate } from './lib/appFlow.js';
import { getEditableSlots } from './lib/editor.js';
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
  editor: null,
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
    Boolean(state.editor),
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

function bindEditorSlotButtons() {
  getEditableSlots(state.editor).forEach((slot) => {
    document.querySelector(`#editor-slot-${slot.id}`)?.addEventListener('click', () => {
      handleSlotSelection(slot.id);
    });
  });
}

function updateResultPanel() {
  elements.resultPanel.innerHTML = renderResult({
    candidateCount: state.candidateCount,
    candidates: state.candidates,
    selectedCandidateId: state.selectedCandidateId,
    editor: state.editor,
    editorGuideText: getEditorGuideText(state.editor),
  });
  bindCandidateButtons();
  bindEditorSlotButtons();
}

function syncPreview() {
  if (!state.clipboardText.trim()) {
    state.errors = [];
    state.players = [];
    state.candidates = [];
    state.candidateCount = 0;
    state.selectedCandidateId = null;
    state.editor = null;
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
  state.editor = null;
  syncPreview();
  updatePanels();
}

function handleBalance() {
  syncPreview();

  if (state.errors.length > 0 || state.players.length === 0) {
    state.candidates = [];
    state.candidateCount = 0;
    state.selectedCandidateId = null;
    state.editor = null;
    updatePanels();
    return;
  }

  const balance = buildBalanceFromClipboard(state.clipboardText);
  state.errors = balance.errors;
  state.players = balance.players;
  state.candidates = balance.candidates;
  state.candidateCount = balance.candidateCount;
  state.selectedCandidateId = balance.selectedCandidateId;
  state.editor = balance.editor;
  updatePanels();
  document.querySelector('#result-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleCandidateSelection(candidateId) {
  if (!candidateId) {
    return;
  }

  const nextSelection = selectCandidate(state.candidates, state.players, candidateId, state.candidateCount);

  state.selectedCandidateId = nextSelection.selectedCandidateId;
  state.editor = nextSelection.editor;
  updateResultPanel();
}

function handleSlotSelection(slotId) {
  if (!slotId || !state.editor) {
    return;
  }

  state.editor = applySlotSelection(state.editor, slotId);
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
  state.editor = null;
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
