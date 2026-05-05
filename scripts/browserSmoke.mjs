import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const importPattern = /(import\s+(?:[\s\S]*?\s+from\s+)?['"])(\.\.?\/[^'"]+)(['"])/g;

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceDirectory = path.resolve(moduleDirectory, '..');
const distDirectory = path.join(workspaceDirectory, 'dist');
const desktopViewport = { label: 'desktop', width: 1280, height: 1400 };
const mobileViewport = { label: 'mobile', width: 360, height: 1200 };

export async function inlineLocalModule(entryPath, cache = new Map()) {
  const absolutePath = path.resolve(entryPath);

  if (cache.has(absolutePath)) {
    return cache.get(absolutePath);
  }

  const source = await readFile(absolutePath, 'utf8');
  const rewrittenSource = await replaceAsync(source, importPattern, async (full, prefix, specifier, suffix) => {
    const childPath = path.resolve(path.dirname(absolutePath), specifier);
    const childUrl = await inlineLocalModule(childPath, cache);
    return `${prefix}${childUrl}${suffix}`;
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(rewrittenSource, 'utf8').toString('base64')}`;

  cache.set(absolutePath, dataUrl);
  return dataUrl;
}

export function createHarnessHtml({ fixtureText, mainModuleUrl, styles, viewportLabel }) {
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Team Builder Browser Smoke</title>
    <style>${styles}</style>
    <style>
      #browser-smoke-result {
        margin: 24px auto;
        width: min(1120px, calc(100% - 32px));
        padding: 16px;
        border-radius: 16px;
        background: rgba(17, 76, 81, 0.08);
        color: #0d2729;
        font: 14px/1.6 monospace;
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <pre id="browser-smoke-result">pending</pre>
    <script type="module">
      import ${JSON.stringify(mainModuleUrl)};

      const fixtureText = ${JSON.stringify(fixtureText)};

      const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
      const waitForPaint = async () => {
        await wait(80);
        await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
        await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
      };

      const smokeResultNode = document.querySelector('#browser-smoke-result');
      const textarea = document.querySelector('#clipboard-input');
      const balanceButton = document.querySelector('#balance-button');

      if (!smokeResultNode) {
        throw new Error('browser smoke result node missing');
      }

      const output = {
        viewportLabel: ${JSON.stringify(viewportLabel)},
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        appReady: Boolean(textarea && balanceButton),
      };

      try {
        if (!textarea || !balanceButton) {
          throw new Error('앱 초기 렌더링이 완료되지 않았습니다.');
        }

        Math.random = () => 0.5;
        textarea.value = fixtureText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        balanceButton.click();
        await waitForPaint();

        const candidateCards = [...document.querySelectorAll('.candidate-card')];
        const miniSlots = [...document.querySelectorAll('.mini-slot-card')];
        const editorTeams = [...document.querySelectorAll('.editor-team-column')];
        const firstSlot = document.querySelector('#editor-slot-A-tank-1');
        const secondSlot = document.querySelector('#editor-slot-B-support-2');

        output.feedbackText = (document.querySelector('#feedback-panel')?.textContent || '').trim();
        output.previewText = (document.querySelector('#preview-panel')?.textContent || '').trim();
        output.resultText = (document.querySelector('#result-content')?.textContent || '').trim();
        output.candidateCountVisible = candidateCards.length;
        output.miniSlotCount = miniSlots.length;
        output.editorTeamCount = editorTeams.length;
        output.editorSlotsPerTeam = editorTeams.map((column) => column.querySelectorAll('.editor-slot-button').length);
        output.hasScoreLabels = /팀 A 총점|팀 B 총점|점수 차이|역할군 차이 합|탱커 차이|언랭 분배 차이/.test(
          output.resultText,
        );
        output.swapTargetsReady = Boolean(firstSlot && secondSlot);
        output.beforeSwap = {
          firstName: firstSlot?.querySelector('.editor-slot-name')?.textContent?.trim() || '',
          firstTier: firstSlot?.querySelector('.editor-slot-tier')?.textContent?.trim() || '',
          secondName: secondSlot?.querySelector('.editor-slot-name')?.textContent?.trim() || '',
          secondTier: secondSlot?.querySelector('.editor-slot-tier')?.textContent?.trim() || '',
        };
        firstSlot?.click();
        await waitForPaint();
        output.firstSelectionHighlighted = Boolean(document.querySelector('#editor-slot-A-tank-1.editor-slot-selected'));
        output.guideAfterFirstSelection = (document.querySelector('.editor-guide')?.textContent || '').trim();
        secondSlot?.click();
        await waitForPaint();
        const refreshedFirstSlot = document.querySelector('#editor-slot-A-tank-1');
        const refreshedSecondSlot = document.querySelector('#editor-slot-B-support-2');
        output.afterSwap = {
          firstName: refreshedFirstSlot?.querySelector('.editor-slot-name')?.textContent?.trim() || '',
          firstTier: refreshedFirstSlot?.querySelector('.editor-slot-tier')?.textContent?.trim() || '',
          secondName: refreshedSecondSlot?.querySelector('.editor-slot-name')?.textContent?.trim() || '',
          secondTier: refreshedSecondSlot?.querySelector('.editor-slot-tier')?.textContent?.trim() || '',
        };
        output.guideAfterSwap = (document.querySelector('.editor-guide')?.textContent || '').trim();
        output.documentScrollWidth = document.documentElement.scrollWidth;
        output.bodyScrollWidth = document.body.scrollWidth;
        output.pageShellScrollWidth = document.querySelector('.page-shell')?.scrollWidth ?? null;
        output.hasHorizontalOverflow =
          document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth;
        output.previewHasSampleName = output.previewText.includes('하늘방패');
        output.resultHasCandidateList = output.resultText.includes('추천 후보 6개');
        output.resultHasTeamLabels = output.resultText.includes('팀 A') && output.resultText.includes('팀 B');
        output.feedbackLooksSuccessful = output.feedbackText.includes('계산이 끝났습니다');
      } catch (error) {
        output.error = error instanceof Error ? error.message : String(error);
      }

      smokeResultNode.textContent = JSON.stringify(output);
    </script>
  </body>
</html>
`;
}

export function parseSmokeResult(dumpedDomText) {
  const match = dumpedDomText.match(/<pre id="browser-smoke-result">([\s\S]*?)<\/pre>/i);

  if (!match) {
    throw new Error('브라우저 덤프에서 smoke 결과 노드를 찾지 못했습니다.');
  }

  return JSON.parse(decodeHtml(match[1]));
}

export function assertViewportResult(result, viewport) {
  const issues = [];

  if (!result.appReady) {
    issues.push('앱 루트가 초기화되지 않았습니다.');
  }

  if (result.error) {
    issues.push(result.error);
  }

  if (result.editorTeamCount !== 2) {
    issues.push(`편집 팀 개수가 2가 아닙니다: ${result.editorTeamCount}`);
  }

  if (result.candidateCountVisible !== 6) {
    issues.push(`보이는 후보 개수가 6개가 아닙니다: ${result.candidateCountVisible}`);
  }

  if (result.miniSlotCount !== 60) {
    issues.push(`압축 미리보기 슬롯 수가 60개가 아닙니다: ${result.miniSlotCount}`);
  }

  if (!Array.isArray(result.editorSlotsPerTeam) || result.editorSlotsPerTeam.some((count) => count !== 5)) {
    issues.push(`편집 영역 슬롯 수가 팀당 5개가 아닙니다: ${JSON.stringify(result.editorSlotsPerTeam)}`);
  }

  if (result.hasScoreLabels) {
    issues.push('메인 결과 UI 에 점수 관련 라벨이 남아 있습니다.');
  }

  if (!result.previewHasSampleName) {
    issues.push('미리보기에서 샘플 플레이어 이름을 찾지 못했습니다.');
  }

  if (!result.resultHasCandidateList) {
    issues.push('결과 영역에서 추천 후보 목록을 찾지 못했습니다.');
  }

  if (!result.resultHasTeamLabels) {
    issues.push('결과 영역에서 팀 A / 팀 B 라벨을 찾지 못했습니다.');
  }

  if (!result.feedbackLooksSuccessful) {
    issues.push('성공 상태 피드백 문구가 렌더링되지 않았습니다.');
  }

  if (!result.swapTargetsReady) {
    issues.push('스왑 대상으로 사용할 슬롯 버튼을 찾지 못했습니다.');
  }

  if (!result.firstSelectionHighlighted) {
    issues.push('첫 슬롯 선택 상태가 시각적으로 표시되지 않았습니다.');
  }

  if (!result.guideAfterFirstSelection.includes('선택했습니다')) {
    issues.push(`첫 슬롯 선택 안내 문구가 예상과 다릅니다: ${result.guideAfterFirstSelection}`);
  }

  if (result.beforeSwap.firstName === result.afterSwap.firstName || result.beforeSwap.secondName === result.afterSwap.secondName) {
    issues.push('두 번째 클릭 후 슬롯 플레이어가 실제로 교체되지 않았습니다.');
  }

  if (result.afterSwap.firstTier !== '마스터' || result.afterSwap.secondTier !== '마스터') {
    issues.push(
      `교차 역할 스왑 뒤 티어 표시가 기대와 다릅니다: ${result.afterSwap.firstTier} / ${result.afterSwap.secondTier}`,
    );
  }

  if (!result.guideAfterSwap.includes('스왑이 적용되었습니다')) {
    issues.push(`스왑 완료 안내 문구가 예상과 다릅니다: ${result.guideAfterSwap}`);
  }

  if (result.hasHorizontalOverflow) {
    issues.push(
      `${viewport.label} viewport(${viewport.width}px)에서 가로 오버플로가 발생했습니다: document=${result.documentScrollWidth}, body=${result.bodyScrollWidth}`,
    );
  }

  return issues;
}

async function replaceAsync(text, pattern, replacer) {
  const matches = [...text.matchAll(pattern)];

  if (matches.length === 0) {
    return text;
  }

  const replacements = await Promise.all(matches.map((match) => replacer(...match)));
  let cursor = 0;
  let result = '';

  for (const [index, match] of matches.entries()) {
    result += text.slice(cursor, match.index);
    result += replacements[index];
    cursor = match.index + match[0].length;
  }

  result += text.slice(cursor);
  return result;
}

function decodeHtml(value) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

function parseArguments(argumentList) {
  const options = {
    browser: null,
    keepArtifacts: false,
    viewports: [desktopViewport, mobileViewport],
  };

  for (const argument of argumentList) {
    if (argument.startsWith('--browser=')) {
      options.browser = argument.slice('--browser='.length);
      continue;
    }

    if (argument === '--keep-artifacts') {
      options.keepArtifacts = true;
      continue;
    }

    if (argument.startsWith('--viewport=')) {
      options.viewports = [parseViewport(argument.slice('--viewport='.length))];
      continue;
    }

    if (argument === '--help') {
      options.help = true;
      continue;
    }
  }

  return options;
}

function parseViewport(value) {
  const match = value.match(/^([a-z0-9-]+):(\d+)x(\d+)$/i);

  if (!match) {
    throw new Error(`viewport 인자는 label:WIDTHxHEIGHT 형식이어야 합니다: ${value}`);
  }

  return {
    label: match[1],
    width: Number.parseInt(match[2], 10),
    height: Number.parseInt(match[3], 10),
  };
}

async function detectBrowser() {
  const candidates = [
    process.env.BROWSER_BIN,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/microsoft-edge',
    '/usr/bin/microsoft-edge-stable',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, ['--version']);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

async function ensureBuildArtifacts() {
  const requiredFiles = [
    path.join(distDirectory, 'index.html'),
    path.join(distDirectory, 'src/main.js'),
    path.join(distDirectory, 'src/styles.css'),
    path.join(distDirectory, 'src/fixtures/samplePlayers.tsv'),
  ];

  for (const requiredFile of requiredFiles) {
    try {
      await access(requiredFile);
    } catch {
      throw new Error(`브라우저 스모크 테스트 전에 npm run build 를 먼저 실행해 주세요. 누락 파일: ${requiredFile}`);
    }
  }
}

async function runViewportSmoke({ browserPath, viewport, tempDirectory, mainModuleUrl, styles, fixtureText }) {
  const htmlPath = path.join(tempDirectory, `${viewport.label}.html`);
  const html = createHarnessHtml({
    fixtureText,
    mainModuleUrl,
    styles,
    viewportLabel: viewport.label,
  });

  await writeFile(htmlPath, html, 'utf8');

  const browserArguments = [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=5000',
    `--window-size=${viewport.width},${viewport.height}`,
    '--dump-dom',
    pathToFileURL(htmlPath).href,
  ];
  const { stdout } = await execFileAsync(browserPath, browserArguments, {
    maxBuffer: 8 * 1024 * 1024,
  });
  const result = parseSmokeResult(stdout);
  const issues = assertViewportResult(result, viewport);

  return {
    viewport,
    result,
    issues,
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.help) {
    console.log(`사용법: node ./scripts/browserSmoke.mjs [--browser=/path/to/chromium] [--viewport=label:WIDTHxHEIGHT] [--keep-artifacts]

기본값:
- desktop: 1280x1400
- mobile: 360x1200
`);
    return;
  }

  const browserPath = options.browser ?? (await detectBrowser());

  if (!browserPath) {
    throw new Error('Chromium 계열 브라우저를 찾지 못했습니다. --browser=/path/to/browser 로 직접 지정해 주세요.');
  }

  await ensureBuildArtifacts();

  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'team-builder-browser-smoke-'));

  try {
    const mainModuleUrl = await inlineLocalModule(path.join(distDirectory, 'src/main.js'));
    const styles = await readFile(path.join(distDirectory, 'src/styles.css'), 'utf8');
    const fixtureText = await readFile(path.join(distDirectory, 'src/fixtures/samplePlayers.tsv'), 'utf8');
    const runResults = [];

    for (const viewport of options.viewports) {
      runResults.push(
        await runViewportSmoke({
          browserPath,
          viewport,
          tempDirectory,
          mainModuleUrl,
          styles,
          fixtureText,
        }),
      );
    }

    const report = {
      browserPath,
      tempDirectory,
      viewports: runResults.map(({ viewport, result, issues }) => ({
        viewport,
        result,
        issues,
        passed: issues.length === 0,
      })),
      passed: runResults.every(({ issues }) => issues.length === 0),
    };

    console.log(JSON.stringify(report, null, 2));

    if (!report.passed) {
      process.exitCode = 1;
    }
  } finally {
    if (!options.keepArtifacts) {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  }
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? '')) {
  await main();
}
