import { UI_COPY, SAMPLE_FORMAT_LINES } from '../constants/copy.js';
import { ROLE_ORDER, formatScore, getRoleConfig, getTierGuideRows } from '../config/gameConfig.js';

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderRoleBadge(role) {
  const config = getRoleConfig(role);
  return `<span class="role-badge ${config.accentClass}">${config.label}</span>`;
}

function renderTierChip(tier) {
  return `<span class="tier-chip ${tier.isUnranked ? 'tier-chip-unranked' : ''}">${escapeHtml(
    tier.description,
  )} <strong>${formatScore(tier.score)}</strong></span>`;
}

export function renderShell() {
  const tierGuide = getTierGuideRows()
    .map(
      (tier) => `
        <li class="guide-list-item">
          <span>${escapeHtml(tier.label)}</span>
          <strong>${escapeHtml(tier.score)}</strong>
        </li>
      `,
    )
    .join('');

  const footerList = UI_COPY.footerBullets
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');

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
            <span>10명</span>
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
            <h2>티어 점수표</h2>
            <p>${escapeHtml(UI_COPY.resultHint)}</p>
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
    return '<p class="feedback-success">검증과 계산이 완료되었습니다. 후보를 눌러 상세 팀 구성을 바로 비교해 보세요.</p>';
  }

  if (hasValidPlayers) {
    return '<p class="feedback-success">입력 확인이 끝났습니다. 팀 나누기 버튼을 누르면 바로 계산합니다.</p>';
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
      const tierCells = ROLE_ORDER.map((role) => `<td>${renderTierChip(player.roles[role])}</td>`).join('');

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

function renderAssignmentCard(assignment) {
  return `
    <article class="assignment-card ${assignment.isUnranked ? 'assignment-card-unranked' : ''}">
      <div class="assignment-top-row">
        ${renderRoleBadge(assignment.assignedRole)}
        <span class="assignment-score">${formatScore(assignment.score)}</span>
      </div>
      <strong class="assignment-name">${escapeHtml(assignment.playerName)}</strong>
      <p class="assignment-meta">
        ${escapeHtml(assignment.tierDescription)}
        ${assignment.isUnranked ? '<span class="unranked-pill">언랭 배정</span>' : ''}
      </p>
    </article>
  `;
}

function renderTeamColumn(team) {
  const assignments = team.assignments.map(renderAssignmentCard).join('');

  return `
    <section class="team-column">
      <header class="team-header">
        <div>
          <p class="team-label">${escapeHtml(team.label)}</p>
          <strong class="team-total">${formatScore(team.totalScore)}</strong>
        </div>
        <div class="team-meta">
          <span>언랭 ${team.unrankedCount}명</span>
          <span>총 ${team.assignments.length}명</span>
        </div>
      </header>
      <div class="assignment-grid">
        ${assignments}
      </div>
    </section>
  `;
}

function renderSummaryCard(label, value, key) {
  return `
    <article class="summary-card" data-summary-key="${escapeHtml(key)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
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
          <p class="candidate-kicker">${index === 0 ? '기본 추천' : '대안 후보'}</p>
          <strong>후보 ${candidate.rank}</strong>
        </div>
        <span class="candidate-difference">${formatScore(candidate.scoreDifference)} 차이</span>
      </div>
      <p class="candidate-team-totals">
        팀 A ${formatScore(candidate.teams[0].totalScore)} · 팀 B ${formatScore(candidate.teams[1].totalScore)}
      </p>
      <div class="candidate-stats">
        <span>역할군 차이 합 ${formatScore(candidate.roleScoreDifferenceSum)}</span>
        <span>탱커 차이 ${formatScore(candidate.tankScoreDifference)}</span>
        <span>언랭 차이 ${candidate.unrankedDifference}명</span>
      </div>
    </button>
  `;
}

export function renderResult(result, candidates = [], selectedCandidateId = null) {
  if (!result) {
    return `<div class="empty-state">${escapeHtml(UI_COPY.emptyResult)}</div>`;
  }

  return `
    <section class="candidate-section">
      <div class="section-heading result-subsection">
        <h3>추천 후보 6개</h3>
        <p>전체 ${result.candidateCount.toLocaleString('ko-KR')}개 조합 중 우선순위가 높은 후보만 표시합니다.</p>
      </div>
      <div class="candidate-list">
        ${candidates.map((candidate, index) => renderCandidateCard(candidate, index, selectedCandidateId)).join('')}
      </div>
    </section>

    <section class="detail-section">
      <div class="section-heading result-subsection">
        <h3>선택된 후보 ${result.rank}</h3>
        <p>후보를 바꿔도 입력값과 미리보기는 유지되고, 아래 상세 팀 구성만 즉시 바뀝니다.</p>
      </div>

      <div class="result-summary">
        ${renderSummaryCard('팀 A 총점', formatScore(result.teams[0].totalScore), 'team-a-total')}
        ${renderSummaryCard('팀 B 총점', formatScore(result.teams[1].totalScore), 'team-b-total')}
        ${renderSummaryCard('점수 차이', formatScore(result.scoreDifference), 'score-difference')}
        ${renderSummaryCard('역할군 차이 합', formatScore(result.roleScoreDifferenceSum), 'role-score-difference-sum')}
        ${renderSummaryCard('탱커 차이', formatScore(result.tankScoreDifference), 'tank-score-difference')}
        ${renderSummaryCard('언랭 분배 차이', `${result.unrankedDifference}명`, 'unranked-difference')}
      </div>

      <p class="result-note">역할군 차이 합은 탱커, 딜러, 힐러 배정 점수 차이의 절대값을 더한 값입니다.</p>

      <div class="teams-grid">
        ${result.teams.map(renderTeamColumn).join('')}
      </div>
    </section>
  `;
}
