import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import {
  assertViewportResult,
  createHarnessHtml,
  inlineLocalModule,
  parseSmokeResult,
} from '../scripts/browserSmoke.mjs';

const workspaceDirectory = process.cwd();

test('inlineLocalModule rewrites local imports to data URLs', async () => {
  const moduleUrl = await inlineLocalModule(path.join(workspaceDirectory, 'src/main.js'));
  const source = Buffer.from(moduleUrl.split(',')[1], 'base64').toString('utf8');

  assert.match(moduleUrl, /^data:text\/javascript;base64,/);
  assert.doesNotMatch(source, /from ['"]\.\.?\//);
  assert.match(source, /data:text\/javascript;base64,/);
});

test('createHarnessHtml embeds the smoke result node and bootstrap data', () => {
  const html = createHarnessHtml({
    fixtureText: '유저 이름\t탱커 티어\t딜러 티어\t힐러 티어',
    mainModuleUrl: 'data:text/javascript;base64,ZXhwb3J0IHt9',
    styles: 'body { color: black; }',
    viewportLabel: 'mobile',
  });

  assert.match(html, /id="browser-smoke-result"/);
  assert.match(html, /id="app"/);
  assert.match(html, /viewportLabel/);
  assert.match(html, /fixtureText/);
});

test('parseSmokeResult reads JSON from dumped DOM output', () => {
  const result = parseSmokeResult(
    '<html><body><pre id="browser-smoke-result">{&quot;teamCount&quot;:2,&quot;assignmentsPerTeam&quot;:[5,5]}</pre></body></html>',
  );

  assert.deepEqual(result, {
    teamCount: 2,
    assignmentsPerTeam: [5, 5],
  });
});

test('assertViewportResult reports the key browser smoke failures', () => {
  const issues = assertViewportResult(
    {
      appReady: true,
      teamCount: 1,
      assignmentsPerTeam: [4],
      scoreDifference: 1,
      unrankedDifference: 2,
      previewHasSampleName: false,
      resultHasTeamLabels: false,
      feedbackLooksSuccessful: false,
      hasHorizontalOverflow: true,
      documentScrollWidth: 380,
      bodyScrollWidth: 380,
    },
    { label: 'mobile', width: 360, height: 1200 },
  );

  assert.ok(issues.some((issue) => issue.includes('팀 개수')));
  assert.ok(issues.some((issue) => issue.includes('가로 오버플로')));
  assert.ok(issues.some((issue) => issue.includes('점수 차이')));
});
