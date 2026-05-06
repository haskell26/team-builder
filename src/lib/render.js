import { UI_COPY, SAMPLE_FORMAT_LINES } from '../constants/copy.js';
import { ROLE_ORDER, getRoleConfig, getTierGuideRows } from '../config/gameConfig.js';
import { PREFERENCE_POINT_TOTAL, formatPreferencePointsSummary } from './preferences.js';

function escapeHtml(value) {
  return `${value}`
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getTierClassName(tierKey) {
  return `tier-${tierKey}`;
}

function getPreferenceSourceLabel(preferenceSource) {
  if (preferenceSource === 'manual') {
    return '직접 조정';
  }

  if (preferenceSource === 'saved') {
    return '저장 불러옴';
  }

  return '기본 2 / 2 / 2';
}

function renderRoleBadge(role, { compact = false } = {}) {
  const config = getRoleConfig(role);

  return `<span class="role-badge ${config.accentClass} ${compact ? 'role-badge-compact' : ''}">${escapeHtml(
    compact ? config.shortLabel : config.label,
  )}</span>`;
}

function renderPreferenceBadge(assignedPreferencePoints, { compact = false } = {}) {
  const label = compact ? `${assignedPreferencePoints}점` : `선호 ${assignedPreferencePoints}점`;

  return `<span class="preference-badge preference-badge-${assignedPreferencePoints} ${
    compact ? 'preference-badge-compact' : ''
  }">${escapeHtml(label)}</span>`;
}

function renderTierToken(tier) {
  return `<span class="tier-token tier-fill ${getTierClassName(tier.key)}">${escapeHtml(tier.description)}</span>`;
}

function renderGuideItem(tier) {
  return `
    <li class="guide-list-item">
      <span class="guide-list-label">${escapeHtml(tier.label)}</span>
      <span class="tier-token tier-fill ${getTierClassName(tier.key)}">${escapeHtml(tier.sample)}</span>
    </li>
  `;
}

function renderRoleTierSummary(roles) {
  return ROLE_ORDER.map(
    (role) => `
      <span class="role-tier-pair">
        ${renderRoleBadge(role, { compact: true })}
        ${renderTierToken(roles[role])}
      </span>
    `,
  ).join('');
}

function renderSavedRoleLine(roles) {
  return ROLE_ORDER.map((role) => `${getRoleConfig(role).shortLabel} ${roles[role].description}`).join(' · ');
}

function renderPreferenceStepper(playerIndex, role, points) {
  const roleConfig = getRoleConfig(role);

  return `
    <div class="preference-stepper">
      <span class="preference-stepper-label">${escapeHtml(roleConfig.label)}</span>
      <div class="preference-stepper-controls">
        <button
          id="preference-minus-${playerIndex}-${role}"
          class="stepper-button"
          type="button"
          ${points === 0 ? 'disabled' : ''}
          aria-label="${escapeHtml(roleConfig.label)} 선호 점수 낮추기"
        >
          -
        </button>
        <strong class="preference-stepper-value">${points}점</strong>
        <button
          id="preference-plus-${playerIndex}-${role}"
          class="stepper-button"
          type="button"
          ${points === PREFERENCE_POINT_TOTAL ? 'disabled' : ''}
          aria-label="${escapeHtml(roleConfig.label)} 선호 점수 높이기"
        >
          +
        </button>
      </div>
    </div>
  `;
}

function renderRosterPlayer(player, index) {
  return `
    <article class="roster-card">
      <div class="roster-card-header">
        <div>
          <h3 class="roster-card-name">${escapeHtml(player.name)}</h3>
          <p class="roster-card-meta">탱커 / 딜러 / 힐러에 총 6점을 나눕니다. 한 역할을 올리면 나머지 두 역할이 자동 조정됩니다.</p>
        </div>
        <span class="source-pill">${escapeHtml(getPreferenceSourceLabel(player.preferenceSource))}</span>
      </div>

      <div class="role-tier-row">
        ${renderRoleTierSummary(player.roles)}
      </div>

      <p class="preference-total">선호 합계 ${PREFERENCE_POINT_TOTAL} / ${PREFERENCE_POINT_TOTAL} · 티어 밸런스를 뒤집지 않는 soft signal</p>

      <div class="preference-controls">
        ${ROLE_ORDER.map((role) => renderPreferenceStepper(index, role, player.preferencePoints[role])).join('')}
      </div>
    </article>
  `;
}

function renderSavedPlayer(record, index, selectedIds) {
  return `
    <article class="saved-player-row">
      <div class="saved-player-main">
        <label class="saved-player-pick" for="saved-player-checkbox-${index}">
          <input
            id="saved-player-checkbox-${index}"
            class="saved-player-checkbox"
            type="checkbox"
            ${selectedIds.has(record.id) ? 'checked' : ''}
          />
          <span class="saved-player-name">${escapeHtml(record.name)}</span>
        </label>
        <p class="saved-player-secondary">${escapeHtml(renderSavedRoleLine(record.roles))}</p>
        <p class="saved-player-secondary">${escapeHtml(formatPreferencePointsSummary(record.preferencePoints))}</p>
      </div>
      <button id="saved-player-delete-${index}" class="ghost-button danger-button saved-player-delete" type="button">
        삭제
      </button>
    </article>
  `;
}

function renderSavedPanelMessage(message, type) {
  if (!message) {
    return '';
  }

  return `<p class="saved-panel-message saved-panel-message-${type}">${escapeHtml(message)}</p>`;
}

function renderPreferenceSummary(summary) {
  return `
    <div class="preference-summary-row">
      <span>3점+ ${summary.high}</span>
      <span>2점 ${summary.balanced}</span>
      ${summary.low > 0 ? `<span>1점 ${summary.low}</span>` : ''}
      ${summary.zero > 0 ? `<span>0점 ${summary.zero}</span>` : ''}
    </div>
  `;
}

function renderMiniSlot(slot) {
  return `
    <div class="mini-slot-card">
      <div class="mini-slot-top">
        ${renderRoleBadge(slot.role, { compact: true })}
        ${renderPreferenceBadge(slot.assignedPreferencePoints, { compact: true })}
      </div>
      <strong class="mini-slot-name tier-fill ${getTierClassName(slot.tierKey)}">${escapeHtml(slot.playerName)}</strong>
      <div class="mini-slot-bottom">
        <span class="mini-slot-tier">${escapeHtml(slot.tierDescription)}</span>
        <span class="mini-slot-order">${slot.slotIndex}번 슬롯</span>
      </div>
    </div>
  `;
}

function renderCandidateTeam(team) {
  return `
    <section class="mini-team-column">
      <p class="mini-team-label">${escapeHtml(team.label)}</p>
      <div class="mini-slot-grid">
        ${team.slots.map(renderMiniSlot).join('')}
      </div>
    </section>
  `;
}

function renderEditorSlot(slot, selectedSlotId) {
  const isSelected = slot.id === selectedSlotId;

  return `
    <button
      id="editor-slot-${slot.id}"
      class="editor-slot-button ${isSelected ? 'editor-slot-selected' : ''}"
      type="button"
      aria-pressed="${isSelected ? 'true' : 'false'}"
    >
      <div class="editor-slot-top">
        <div class="editor-slot-header">
          ${renderRoleBadge(slot.role)}
          <span class="editor-slot-label">${escapeHtml(slot.teamLabel)} ${slot.slotIndex}</span>
        </div>
        ${renderPreferenceBadge(slot.assignedPreferencePoints)}
      </div>
      <strong class="editor-slot-name tier-fill ${getTierClassName(slot.tierKey)}">${escapeHtml(slot.playerName)}</strong>
      <p class="editor-slot-tier">${escapeHtml(slot.tierDescription)}</p>
    </button>
  `;
}

function renderEditorTeam(team, selectedSlotId) {
  return `
    <section class="editor-team-column">
      <header class="editor-team-header">
        <p class="editor-team-kicker">최종 편집</p>
        <h4>${escapeHtml(team.label)}</h4>
        ${renderPreferenceSummary(team.preferenceSummary)}
      </header>
      <div class="editor-slot-grid">
        ${team.slots.map((slot) => renderEditorSlot(slot, selectedSlotId)).join('')}
      </div>
    </section>
  `;
}

function renderCandidateCard(candidate, index, selectedCandidateId) {
  const isSelected = candidate.id === selectedCandidateId;

  return `
    <button
      id="candidate-button-${index + 1}"
      class="candidate-card ${isSelected ? 'candidate-card-selected' : ''}"
      type="button"
      aria-pressed="${isSelected ? 'true' : 'false'}"
    >
      <div class="candidate-card-header">
        <div>
          <p class="candidate-kicker">${index === 0 ? '기본 추천' : '비교 후보'}</p>
          <strong>후보 ${candidate.rank}</strong>
        </div>
        <span class="candidate-state">${isSelected ? '편집 중' : '불러오기'}</span>
      </div>
      ${renderPreferenceSummary(candidate.preferenceSummary)}
      <div class="candidate-compact-grid">
        ${candidate.teams.map(renderCandidateTeam).join('')}
      </div>
    </button>
  `;
}

export function renderShell() {
  const tierGuide = getTierGuideRows().map(renderGuideItem).join('');
  const footerList = UI_COPY.footerBullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('');

  return `
    <div class="page-shell">
      <header class="hero-card">
        <p class="eyebrow">${escapeHtml(UI_COPY.eyebrow)}</p>
        <div class="hero-title-row">
          <div>
            <h1>${escapeHtml(UI_COPY.title)}</h1>
            <p class="hero-subtitle">${escapeHtml(UI_COPY.subtitle)}</p>
          </div>
          <div class="hero-score-badge">
            <span>10명 고정 매칭</span>
            <strong>1탱 2딜 2힐</strong>
          </div>
        </div>
      </header>

      <main class="main-grid">
        <section class="panel-card input-panel">
          <div class="section-heading">
            <h2>${escapeHtml(UI_COPY.inputTitle)}</h2>
            <p>${escapeHtml(UI_COPY.inputHint)}</p>
          </div>

          <label class="textarea-label" for="clipboard-input">엑셀에서 복사한 표</label>
          <textarea
            id="clipboard-input"
            class="clipboard-textarea"
            spellcheck="false"
            placeholder="유저 이름\t탱커 티어\t딜러 티어\t힐러 티어\n하늘방패\t마스터\t실버\t골드"
          ></textarea>

          <div class="button-row">
            <button id="sample-button" class="ghost-button" type="button">샘플 데이터 넣기</button>
            <button id="clear-button" class="ghost-button" type="button">입력 비우기</button>
            <button id="balance-button" class="primary-button" type="button">팀 나누기</button>
          </div>

          <div id="feedback-panel"></div>
        </section>

        <section class="panel-card side-panel">
          <div class="section-heading">
            <h2>${escapeHtml(UI_COPY.sampleTitle)}</h2>
            <p>헤더 행은 있어도 되고 없어도 됩니다. 붙여넣을 때는 탭 구분만 유지해 주세요.</p>
          </div>
          <pre class="sample-pre">${escapeHtml(SAMPLE_FORMAT_LINES.join('\n'))}</pre>

          <div class="section-heading compact-heading">
            <h2>티어 색상 가이드</h2>
            <p>${escapeHtml(UI_COPY.tierGuideHint)}</p>
          </div>
          <ul class="guide-list">${tierGuide}</ul>

          <div class="section-heading compact-heading">
            <h2>${escapeHtml(UI_COPY.footerTitle)}</h2>
          </div>
          <ul class="assumption-list">${footerList}</ul>
        </section>
      </main>

      <section class="panel-card">
        <div class="section-heading">
          <h2>${escapeHtml(UI_COPY.savedTitle)}</h2>
          <p>${escapeHtml(UI_COPY.savedHint)}</p>
        </div>
        <div id="saved-player-panel"></div>
      </section>

      <section class="panel-card">
        <div class="section-heading">
          <h2>${escapeHtml(UI_COPY.previewTitle)}</h2>
          <p>${escapeHtml(UI_COPY.previewHint)}</p>
        </div>
        <div id="preview-panel"></div>
      </section>

      <section class="panel-card" id="result-panel">
        <div class="section-heading">
          <h2>${escapeHtml(UI_COPY.resultTitle)}</h2>
          <p>${escapeHtml(UI_COPY.resultHint)}</p>
        </div>
        <div id="result-content"></div>
      </section>
    </div>
  `;
}

export function renderFeedback(errors, hasText, hasValidPlayers, hasResult) {
  if (!hasText) {
    return '<p class="feedback-neutral">표를 붙여넣거나 저장된 플레이어 10명을 불러오면 바로 검증 결과와 현재 매치가 표시됩니다.</p>';
  }

  if (errors.length > 0) {
    return `
      <div class="feedback-block feedback-error" role="alert">
        <strong>입력을 다시 확인해 주세요.</strong>
        <ul class="feedback-list">
          ${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  if (hasResult) {
    return '<p class="feedback-success">계산이 끝났습니다. 후보 카드를 비교하고 아래 편집 슬롯에서 바로 스왑할 수 있습니다.</p>';
  }

  if (hasValidPlayers) {
    return '<p class="feedback-success">입력 확인이 끝났습니다. 아래에서 탱커 / 딜러 / 힐러 6점 분배를 조정하거나 현재 10명을 저장한 뒤 팀 나누기를 눌러 주세요.</p>';
  }

  return '<p class="feedback-neutral">입력 대기 중입니다.</p>';
}

export function renderSavedPlayers(records, { selectedIds, canLoadSelected, storageAvailable, message, warning }) {
  const selectedCount = selectedIds.size;
  const saveSupportHint = storageAvailable
    ? '체크한 플레이어는 정확히 10명일 때만 현재 매치로 불러올 수 있습니다.'
    : '이 환경에서는 브라우저 저장소를 사용할 수 없어 저장/불러오기가 비활성화됩니다.';

  return `
    <div class="saved-toolbar">
      <div>
        <strong class="saved-toolbar-title">저장된 플레이어 ${records.length}명</strong>
        <p class="saved-toolbar-meta">선택 ${selectedCount} / 10</p>
      </div>
      <div class="saved-toolbar-actions">
        <button id="clear-saved-button" class="ghost-button danger-button" type="button" ${
          records.length > 0 && storageAvailable ? '' : 'disabled'
        }>
          전체 삭제
        </button>
        <button id="load-selected-button" class="primary-button" type="button" ${canLoadSelected ? '' : 'disabled'}>
          선택한 10명 불러오기
        </button>
      </div>
    </div>

    <p class="saved-toolbar-hint">${escapeHtml(saveSupportHint)}</p>
    ${renderSavedPanelMessage(message, 'success')}
    ${renderSavedPanelMessage(warning, storageAvailable ? 'warning' : 'error')}

    ${
      records.length === 0
        ? `<div class="empty-state">${escapeHtml(UI_COPY.emptySaved)}</div>`
        : `<div class="saved-player-list">${records
            .map((record, index) => renderSavedPlayer(record, index, selectedIds))
            .join('')}</div>`
    }
  `;
}

export function renderPreview(players, { canSaveCurrentRoster, storageAvailable }) {
  const buttonDisabled = canSaveCurrentRoster && storageAvailable ? '' : 'disabled';
  const toolbarHint = storageAvailable
    ? '각 플레이어는 탱커 / 딜러 / 힐러에 총 6점을 나눕니다. 선호 점수는 티어 밸런스를 뒤집지 않지만, 같은 밸런스 후보 안에서는 더 잘 맞는 조합을 앞쪽에 보여줄 수 있습니다.'
    : '현재 환경에서는 브라우저 저장소를 사용할 수 없어 저장 버튼이 비활성화됩니다.';

  return `
    <div class="preview-toolbar">
      <div>
        <strong class="saved-toolbar-title">현재 매치 ${players.length}명</strong>
        <p class="saved-toolbar-meta">${escapeHtml(toolbarHint)}</p>
      </div>
      <button id="save-current-button" class="ghost-button" type="button" ${buttonDisabled}>
        현재 10명 저장/업데이트
      </button>
    </div>

    ${
      players.length === 0
        ? `<div class="empty-state">${escapeHtml(UI_COPY.emptyPreview)}</div>`
        : `<div class="roster-list">${players.map(renderRosterPlayer).join('')}</div>`
    }
  `;
}

export function renderResult({ candidateCount, candidates = [], selectedCandidateId = null, editor, editorGuideText }) {
  if (!editor) {
    return `<div class="empty-state">${escapeHtml(UI_COPY.emptyResult)}</div>`;
  }

  return `
    <section class="candidate-section">
      <div class="section-heading result-subsection">
        <h3>추천 후보 6개</h3>
        <p>전체 ${candidateCount.toLocaleString('ko-KR')}개 조합 중 빠르게 비교하기 좋은 상위 후보만 보여줍니다.</p>
      </div>
      <div class="candidate-list">
        ${candidates.map((candidate, index) => renderCandidateCard(candidate, index, selectedCandidateId)).join('')}
      </div>
    </section>

    <section class="detail-section">
      <div class="section-heading result-subsection">
        <h3>선택 후보 ${editor.rank} 편집</h3>
        <p>후보 카드를 누르면 언제든 새로 불러오며, 이전 스왑 상태는 초기화됩니다.</p>
      </div>

      <p class="editor-guide">${escapeHtml(editorGuideText)}</p>

      <div class="editor-grid">
        ${editor.teams.map((team) => renderEditorTeam(team, editor.selectedSlotId)).join('')}
      </div>
    </section>
  `;
}
