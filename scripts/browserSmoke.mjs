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

        textarea.value = fixtureText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        balanceButton.click();
        await waitForPaint();

        const summaryValues = [...document.querySelectorAll('.summary-card strong')].map((node) =>
          (node.textContent || '').trim(),
        );
        const teamColumns = [...document.querySelectorAll('.team-column')];

        output.feedbackText = (document.querySelector('#feedback-panel')?.textContent || '').trim();
        output.previewText = (document.querySelector('#preview-panel')?.textContent || '').trim();
        output.resultText = (document.querySelector('#result-content')?.textContent || '').trim();
        output.teamCount = teamColumns.length;
        output.assignmentsPerTeam = teamColumns.map((column) => column.querySelectorAll('.assignment-card').length);
        output.unrankedAssignments = document.querySelectorAll('.assignment-card-unranked').length;
        output.summaryValues = summaryValues;
        output.scoreDifference = Number.parseInt(summaryValues[0], 10);
        output.unrankedDifference = Number.parseInt(summaryValues[1], 10);
        output.documentScrollWidth = document.documentElement.scrollWidth;
        output.bodyScrollWidth = document.body.scrollWidth;
        output.pageShellScrollWidth = document.querySelector('.page-shell')?.scrollWidth ?? null;
        output.hasHorizontalOverflow =
          document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth;
        output.previewHasSampleName = output.previewText.includes('하늘방패');
        output.resultHasTeamLabels = output.resultText.includes('1팀') && output.resultText.includes('2팀');
        output.feedbackLooksSuccessful = output.feedbackText.includes('검증이 완료되었습니다');
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

  if (result.teamCount !== 2) {
    issues.push(`팀 개수가 2가 아닙니다: ${result.teamCount}`);
  }

  if (!Array.isArray(result.assignmentsPerTeam) || result.assignmentsPerTeam.some((count) => count !== 5)) {
    issues.push(`각 팀 인원 수가 5명이 아닙니다: ${JSON.stringify(result.assignmentsPerTeam)}`);
  }

  if (result.scoreDifference !== 0) {
    issues.push(`샘플 데이터 점수 차이가 0이 아닙니다: ${result.scoreDifference}`);
  }

  if (result.unrankedDifference !== 0) {
    issues.push(`샘플 데이터 언랭 분배 차이가 0이 아닙니다: ${result.unrankedDifference}`);
  }

  if (!result.previewHasSampleName) {
    issues.push('미리보기에서 샘플 플레이어 이름을 찾지 못했습니다.');
  }

  if (!result.resultHasTeamLabels) {
    issues.push('결과 영역에서 1팀 / 2팀 라벨을 찾지 못했습니다.');
  }

  if (!result.feedbackLooksSuccessful) {
    issues.push('성공 상태 피드백 문구가 렌더링되지 않았습니다.');
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
