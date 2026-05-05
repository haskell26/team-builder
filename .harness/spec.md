# Team Builder

## Goal

각기 다른 실력을 가진 게임 플레이어 10명이 모였을 때, 밸런스가 맞는 두 팀으로 나누기

## Users

- Who is the primary user?
오버워치 게임 커뮤니티의 관리자
- What problem are they solving?
커뮤니티 내 정해진 플레이어 10명을 밸런스한 두 팀으로 나눠야 한다.

## Core Flows

유저가 데이터를 다음 형식으로 엑셀로부터 복사해와서 붙여넣는다.
|유저 이름|탱커 티어|딜러 티어|힐러 티어|
|...|
그러면 각 티어별로 점수를 할당해서 점수의 총합이 양팀이 가장 적게 차이가 나야 한다. 각 팀은 탱커 1명, 딜러 2명, 힐러 2명으로 구성된다. (Unranked는 양팀에 최대한 비슷하게 분배돼야 한다.)
U 0점 (Unranked)
브론즈 1점
...
다이아 5점
마스터 6점
그마 7점
github.io로 올릴 수 있게 프론트엔드만으로 구성된 프로젝트여야 한다.

## Must-Have Features

user friendly input (copy-paste from excel)
nicely-readable output
product language in korean

## Nice-To-Have Features

- 플레이어별 역할 선호도 순서 적용 기능
- 현재는 오버워치만 다루지만 추후 리그오브레전드로 확장될 가능성 있음
- 게임 플레이어들 티어 저장 기능
- 저장한 플레이어 중 10명 선택해서 불러오기 기능

## Technical Constraints

- Preferred language or framework: frontend
- Required integrations
- Deployment assumptions: github.io로 프론트엔드만 배포 예정
- Anything the agent must avoid: 복잡한 UX

## Acceptance Tests

- Concrete test the final output must pass
- Another concrete test

## Non-Goals

- What should not be built

## Definition Of Done

- What makes this deliverable ready to hand off
