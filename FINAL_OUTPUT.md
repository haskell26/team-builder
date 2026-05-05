# Final Output

## 이번 라운드 구현 범위

- 기존 붙여넣기, 검증, 단일 추천 흐름을 유지한 채 상위 후보 조합 6개 비교 기능을 추가했습니다.
- 입력 첫 행이 정확한 한국어 헤더일 때만 헤더로 인식하도록 바꿔, 헤더 포함/미포함 붙여넣기를 모두 지원합니다.
- 후보 조합 정렬 기준을 `총점 차이 -> 역할군 차이 합 -> 탱커 차이 -> 언랭 분배 차이 -> 완전 동률 시 무작위` 순서로 확장했습니다.
- 결과 화면에 후보 카드 목록을 추가하고, 첫 후보를 기본 선택한 뒤 클릭 시 상세 팀 구성이 즉시 바뀌도록 수정했습니다.
- 파서, 옵티마이저, DOM 흐름 테스트를 이번 기능 기준으로 확장했습니다.

## 사용 방법

1. `유저 이름 / 탱커 티어 / 딜러 티어 / 힐러 티어` 4열을 가진 10명 표를 붙여넣습니다.
   - 헤더 행은 있어도 되고 없어도 됩니다.
2. `팀 나누기`를 누르면 후보 6개가 표시됩니다.
3. 후보 카드에서 `팀 A 총점`, `팀 B 총점`, `점수 차이`, `역할군 차이 합`, `탱커 차이`, `언랭 차이`를 비교합니다.
4. 원하는 후보를 클릭해 아래 상세 `팀 A / 팀 B` 배정 결과를 확인합니다.

## 검증 기록

- 실행: `npm test`
  - 결과: 통과
- 실행: `npm run build`
  - 결과: 통과, `dist/` 정적 번들 생성 확인
- 실행: `for name in chromium chromium-browser google-chrome google-chrome-stable microsoft-edge microsoft-edge-stable; do command -v "$name" || true; done`
  - 결과: Chromium 계열 브라우저 경로를 찾지 못해서 `npm run test:browser` 는 이번 샌드박스에서 실행하지 않았습니다.
- 실행: `node --input-type=module -e "import { readFile } from 'node:fs/promises'; import { buildBalanceFromClipboard } from './src/lib/appFlow.js'; const sample = await readFile('./src/fixtures/samplePlayers.tsv', 'utf8'); const headerless = sample.split('\n').slice(1).join('\n'); for (const [label, text] of [['header', sample], ['headerless', headerless]]) { const balance = buildBalanceFromClipboard(text, { rng: () => 0.5 }); console.log(label, balance.players.length, balance.candidates.length, balance.candidateCount, balance.result.scoreDifference, balance.result.roleScoreDifferenceSum, balance.result.tankScoreDifference, balance.result.unrankedDifference, balance.result.teams.map((team) => team.totalScore).join('/')); }"`
  - 결과: `header 10 6 113400 0 0 0 0 14/14`
  - 결과: `headerless 10 6 113400 0 0 0 0 14/14`

## 가정

- 역할군 차이 합은 `탱커/딜러/힐러` 배정 점수 차이 절대값의 합으로 계산했습니다.
- 언랭 분배 차이는 양 팀 전체 언랭 배정 인원 수 차이로 계산했습니다.
- 동률 후보 무작위화는 앞선 4개 지표가 모두 같은 경우에만 적용되며, 테스트에서는 주입한 RNG로 고정 검증했습니다.

## 남은 제한

- 실제 브라우저 엔진으로 `dist/` 결과를 확인하는 `npm run test:browser` 는 브라우저 바이너리가 없는 현재 환경에서 실행하지 못했습니다.
- 브라우저 스모크 스크립트는 빌드된 JS/CSS를 임시 HTML 하네스에 올려 검증하는 방식이라, 실제 `dist/index.html` 진입 자체를 대체하지는 않습니다.
- 역할 선호도, 저장 기능, 다른 게임 확장은 여전히 범위 밖입니다.
