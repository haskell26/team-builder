import { UI_COPY, SAMPLE_FORMAT_LINES } from '../constants/copy.js';
import { ROLE_ORDER, getRoleConfig, getTierGuideRows } from '../config/gameConfig.js';

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getTierClassName(tierKey) {
  return `tier-${tierKey}`;
}

function renderRoleBadge(role, { compact = false } = {}) {
  const config = getRoleConfig(role);

  return `<span class="role-badge ${config.accentClass} ${compact ? 'role-badge-compact' : ''}">${escapeHtml(
    compact ? config.shortLabel : config.label,
  )}</span>`;
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

function renderMiniSlot(slot) {
  return `
    <div class="mini-slot-card">
      <div class="mini-slot-top">
        ${renderRoleBadge(slot.role, { compact: true })}
        <span class="mini-slot-order">${slot.slotIndex}</span>
      </div>
      <strong class="mini-slot-name tier-fill ${getTierClassName(slot.tierKey)}">${escapeHtml(slot.playerName)}</strong>
      <span class="mini-slot-tier">${escapeHtml(slot.tierDescription)}</span>
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
      <div class="editor-slot-header">
        ${renderRoleBadge(slot.role)}
        <span class="editor-slot-label">${escapeHtml(slot.teamLabel)} ${slot.slotIndex}</span>
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
            <button id="clear-button" class="ghost-button" type="button">초기화</button>
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
    return '<p class="feedback-neutral">표를 붙여넣으면 바로 검증 결과와 미리보기가 표시됩니다.</p>';
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
    return '<p class="feedback-success">계산이 끝났습니다. 후보를 비교한 뒤 아래 편집 영역에서 바로 스왑할 수 있습니다.</p>';
  }

  if (hasValidPlayers) {
    return '<p class="feedback-success">입력 확인이 끝났습니다. 팀 나누기 버튼을 누르면 후보 6개를 계산합니다.</p>';
  }

  return '<p class="feedback-neutral">입력 대기 중입니다.</p>';
}

export function renderPreview(players) {
  if (players.length === 0) {
    return `<div class="empty-state">${escapeHtml(UI_COPY.emptyPreview)}</div>`;
  }

  const headerCells = ROLE_ORDER.map((role) => `<th>${escapeHtml(getRoleConfig(role).label)}</th>`).join('');
  const rows = players
    .map((player) => {
      const tierCells = ROLE_ORDER.map((role) => `<td>${renderTierToken(player.roles[role])}</td>`).join('');

      return `
        <tr>
          <td><strong>${escapeHtml(player.name)}</strong></td>
          ${tierCells}
        </tr>
      `;
    })
    .join('');

  return `
    <div class="table-frame">
      <table class="preview-table">
        <thead>
          <tr>
            <th>유저 이름</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
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
