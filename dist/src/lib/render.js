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
            placeholder="유저 이름\t탱커 티어\t딜러 티어\t힐러 티어"
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
            <p>헤더 이름과 탭 구분을 그대로 유지해 주세요.</p>
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
    return '<p class="feedback-success">검증이 완료되었습니다. 아래 결과 카드에서 팀 구성을 확인해 주세요.</p>';
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

export function renderResult(result) {
  if (!result) {
    return `<div class="empty-state">${escapeHtml(UI_COPY.emptyResult)}</div>`;
  }

  return `
    <div class="result-summary">
      <article class="summary-card">
        <span>점수 차이</span>
        <strong>${formatScore(result.scoreDifference)}</strong>
      </article>
      <article class="summary-card">
        <span>언랭 분배 차이</span>
        <strong>${result.unrankedDifference}명</strong>
      </article>
      <article class="summary-card">
        <span>검토한 조합</span>
        <strong>${result.candidateCount.toLocaleString('ko-KR')}개</strong>
      </article>
    </div>

    <div class="teams-grid">
      ${result.teams.map(renderTeamColumn).join('')}
    </div>
  `;
}
