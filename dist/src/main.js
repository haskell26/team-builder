import { SAMPLE_FIXTURE_TEXT } from './constants/copy.js';
import {
  applySlotSelection,
  buildBalanceFromPlayers,
  getEditorGuideText,
  loadSavedPlayersIntoMatch,
  parseMatchPlayersFromClipboard,
  refreshResultsFromPlayers,
  selectCandidate,
  updateMatchPlayerPreference,
} from './lib/appFlow.js';
import { getEditableSlots } from './lib/editor.js';
import { loadPlayerStore, saveCurrentPlayersToStore } from './lib/playerStore.js';
import { renderFeedback, renderPreview, renderResult, renderSavedPlayers, renderShell } from './lib/render.js';

const root = document.querySelector('#app');

const state = {
  clipboardText: '',
  errors: [],
  matchPlayers: [],
  savedPlayers: [],
  savedPlayerSelectionIds: new Set(),
  storageAvailable: true,
  storageWarning: '',
  savedPanelMessage: '',
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
  savedPlayerPanel: document.querySelector('#saved-player-panel'),
  resultPanel: document.querySelector('#result-content'),
};

function canSaveCurrentRoster() {
  return state.errors.length === 0 && state.matchPlayers.length === 10;
}

function canLoadSavedSelection() {
  return state.savedPlayerSelectionIds.size === 10;
}

function resetResults() {
  state.candidates = [];
  state.candidateCount = 0;
  state.selectedCandidateId = null;
  state.editor = null;
}

function reconcileSavedSelections() {
  state.savedPlayerSelectionIds = new Set(
    [...state.savedPlayerSelectionIds].filter((playerId) => state.savedPlayers.some((record) => record.id === playerId)),
  );
}

function updatePanels() {
  updateFeedbackPanel();
  updateSavedPlayerPanel();
  updatePreviewPanel();
  updateResultPanel();
}

function updateFeedbackPanel() {
  elements.feedbackPanel.innerHTML = renderFeedback(
    state.errors,
    Boolean(state.clipboardText.trim()),
    state.matchPlayers.length > 0,
    Boolean(state.editor),
  );
}

function bindSavedPlayerControls() {
  const loadSelectedButton = document.querySelector('#load-selected-button');

  if (loadSelectedButton) {
    loadSelectedButton.disabled = !canLoadSavedSelection() || !state.storageAvailable;
    loadSelectedButton.addEventListener('click', handleLoadSelectedSavedPlayers);
  }

  state.savedPlayers.forEach((record, index) => {
    const checkbox = document.querySelector(`#saved-player-checkbox-${index}`);

    if (!checkbox) {
      return;
    }

    checkbox.checked = state.savedPlayerSelectionIds.has(record.id);
    checkbox.addEventListener('change', (event) => {
      handleSavedPlayerToggle(record.id, Boolean(event.currentTarget.checked));
    });
  });
}

function updateSavedPlayerPanel() {
  elements.savedPlayerPanel.innerHTML = renderSavedPlayers(state.savedPlayers, {
    selectedIds: state.savedPlayerSelectionIds,
    canLoadSelected: canLoadSavedSelection(),
    storageAvailable: state.storageAvailable,
    message: state.savedPanelMessage,
    warning: state.storageWarning,
  });
  bindSavedPlayerControls();
}

function bindPreviewControls() {
  const saveCurrentButton = document.querySelector('#save-current-button');

  if (saveCurrentButton) {
    saveCurrentButton.disabled = !canSaveCurrentRoster() || !state.storageAvailable;
    saveCurrentButton.addEventListener('click', handleSaveCurrentRoster);
  }

  state.matchPlayers.forEach((player, playerIndex) => {
    player.preferenceOrder.forEach((role, rankIndex) => {
      const select = document.querySelector(`#preference-select-${playerIndex}-${rankIndex}`);

      if (!select) {
        return;
      }

      select.value = role;
      select.addEventListener('change', (event) => {
        handlePreferenceChange(player.id, rankIndex, event.currentTarget.value);
      });
    });
  });
}

function updatePreviewPanel() {
  elements.previewPanel.innerHTML = renderPreview(state.matchPlayers, {
    canSaveCurrentRoster: canSaveCurrentRoster(),
    storageAvailable: state.storageAvailable,
  });
  bindPreviewControls();
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

function syncMatchPlayersFromClipboard() {
  if (!state.clipboardText.trim()) {
    state.errors = [];
    state.matchPlayers = [];
    return;
  }

  const parsed = parseMatchPlayersFromClipboard(state.clipboardText, state.savedPlayers);
  state.errors = parsed.errors;
  state.matchPlayers = parsed.errors.length > 0 ? [] : parsed.players;
}

function loadSavedPlayersFromStore() {
  const loaded = loadPlayerStore();

  state.savedPlayers = loaded.records;
  state.storageAvailable = loaded.storageAvailable;
  state.storageWarning = loaded.warning;
  reconcileSavedSelections();
}

function handleInputChange(nextValue) {
  state.clipboardText = nextValue;
  state.savedPanelMessage = '';
  resetResults();
  syncMatchPlayersFromClipboard();
  updatePanels();
}

function handleBalance() {
  if (state.errors.length > 0 || state.matchPlayers.length === 0) {
    resetResults();
    updatePanels();
    return;
  }

  const balance = buildBalanceFromPlayers(state.matchPlayers);

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

  const nextSelection = selectCandidate(state.candidates, state.matchPlayers, candidateId, state.candidateCount);

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

function handlePreferenceChange(playerId, rankIndex, nextRole) {
  state.matchPlayers = updateMatchPlayerPreference(state.matchPlayers, playerId, rankIndex, nextRole);

  if (state.candidates.length > 0 || state.editor) {
    const refreshed = refreshResultsFromPlayers(state.candidates, state.editor, state.matchPlayers);

    state.candidates = refreshed.candidates;
    state.editor = refreshed.editor;
  }

  updatePanels();
}

function handleSaveCurrentRoster() {
  if (!canSaveCurrentRoster()) {
    return;
  }

  const result = saveCurrentPlayersToStore(state.savedPlayers, state.matchPlayers);

  state.savedPlayers = result.records;
  state.storageAvailable = result.storageAvailable;
  state.storageWarning = result.warning;
  state.savedPanelMessage = result.success
    ? '현재 10명의 티어와 역할 선호도를 저장하거나 업데이트했습니다.'
    : '';
  reconcileSavedSelections();
  updatePanels();
}

function handleSavedPlayerToggle(playerId, checked) {
  if (checked) {
    state.savedPlayerSelectionIds.add(playerId);
  } else {
    state.savedPlayerSelectionIds.delete(playerId);
  }

  updateSavedPlayerPanel();
}

function handleLoadSelectedSavedPlayers() {
  if (!canLoadSavedSelection()) {
    return;
  }

  const selectedPlayers = state.savedPlayers.filter((record) => state.savedPlayerSelectionIds.has(record.id));
  const loadedMatch = loadSavedPlayersIntoMatch(selectedPlayers);

  state.clipboardText = loadedMatch.clipboardText;
  state.errors = [];
  state.matchPlayers = loadedMatch.players;
  state.savedPanelMessage = '선택한 10명을 현재 매치 입력으로 불러왔습니다. 필요하면 선호도를 조금만 다듬은 뒤 팀을 계산해 주세요.';
  resetResults();
  elements.textarea.value = state.clipboardText;
  updatePanels();
}

function loadSampleFixture() {
  elements.textarea.value = SAMPLE_FIXTURE_TEXT;
  handleInputChange(SAMPLE_FIXTURE_TEXT);
}

function clearAll() {
  state.clipboardText = '';
  state.errors = [];
  state.matchPlayers = [];
  state.savedPanelMessage = '';
  resetResults();
  elements.textarea.value = '';
  updatePanels();
}

elements.textarea.addEventListener('input', (event) => {
  handleInputChange(event.currentTarget.value);
});
elements.balanceButton.addEventListener('click', handleBalance);
elements.sampleButton.addEventListener('click', loadSampleFixture);
elements.clearButton.addEventListener('click', clearAll);

loadSavedPlayersFromStore();
updatePanels();
