# 06. 시험 계획

## 자동 테스트
- `npm test` (vitest): core/transcript, core/sentences, core/latency, engines/soniox 의 token→Chunk 변환.
- `npm run e2e` (Playwright, mock 엔진): 시작 → 자막 표시 → 정지 → 설정 토글이 화면에 반영되는지.
- 이 환경의 Chromium은 사전 설치됨. `npx playwright install` 금지.

## 실기 시험 (사람이 휴대폰으로)
1. Android Chrome / iPhone Safari에서 접속 → 홈 화면에 추가.
2. 설정에서 지연 표시 ON.
3. 아래 대본을 각 언어쌍(ko↔en, ko↔ja, ko↔zh)으로 3회씩 읽기. 조용한 방 / 소음(카페) 각각.
4. 기록할 것: p50/p90 첫글자·첫번역·확정 시간, 오역 수(문장 단위), 체감.

| 날짜 | 기기 | 엔진 | 언어쌍 | 환경 | 첫글자 p50 | 첫번역 p50 | 확정 p50 | 오역/문장 | 메모 |
|---|---|---|---|---|---|---|---|---|---|
| (미측정) | | | | | | | | | |

## 시험 대본 (의료 + 일상)
- "Where is the trauma bay? The patient has a blood pressure of eighty over fifty."
- "환자 의식은 명료하고, 복부 압통이 있습니다. CT를 먼저 찍겠습니다."
- 「痛みはどこですか。いつから痛いですか。」
- "请问洗手间在哪里？我需要一杯热水。"
