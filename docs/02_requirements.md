# 02. 요구사항 명세

## 0. 제품 한 줄 정의
휴대폰 마이크로 들은 말을 **실시간으로 받아쓰고 번역**해서, 휴대폰 화면에 **스마트 글라스 HUD처럼**(검은 바탕, 녹색 단색 글자) 띄워 주는 앱. 글라스 기기 불필요.

## 1. 우선순위 원칙 (사용자 지시)
1. **실시간성**: 말이 끝나기 전에 글자가 보여야 함. 목표 지표는 §5.
2. **정확성**: 초벌(빠름) → 확정(정확) 2단계. 용어집·문맥 반영.
3. **사용자 제어**: 언어와 모든 기능을 사용자가 선택하고 켜고 끌 수 있음.
4. 언어: 1차 지원 = 한국어(ko), 중국어 보통화 간체(zh), 일본어(ja), 영어(en). 코드 구조는 언어 추가가 목록 한 줄로 끝나게.

## 2. 기능 목록 (ID는 코드·작업목록과 공통)

| ID | 기능 | 설명 | 기본값 | 단계 |
|---|---|---|---|---|
| F1 | 번역 자막 (한 방향) | 상대 언어 → 내 언어. 원문/번역 동시 또는 번역만 | ON | MVP |
| F2 | 양방향 대화 | 언어 A↔B 자동 감지 후 서로의 언어로 번역. 화면 위쪽은 상대방용(180° 뒤집힘) | OFF | MVP |
| F3 | 받아쓰기 전용 | 번역 없이 원문 자막만 (청각 보조) | OFF | MVP |
| F4 | HUD 표시 | 글라스 화면 흉내. 크기·줄 수·위치·색·밝기 조절 | ON | MVP |
| F5 | 중간결과 표시 | 확정 전 글자를 흐리게 즉시 표시 | ON | MVP |
| F6 | 정밀 번역(2단계) | 확정 문장을 LLM이 문맥·용어집으로 다시 번역해 교체 | OFF | v1 |
| F7 | 화자 구분 | 화자별 라벨/색 | OFF | v1 |
| F8 | 용어집 | 사용자 단어 쌍(예: 의학용어). 엔진 context + LLM 프롬프트에 주입 | 빈 목록 | v1 |
| F9 | 기록·내보내기 | 세션 저장(기기 내), 텍스트/Markdown 내보내기, 삭제 | ON(기기 내) | v1 |
| F10 | 요약 | 세션 종료 후 LLM 요약 | OFF | v2 |
| F11 | 대화 보조 | 대화 맥락으로 답변 힌트/핵심 표시 + 사전 자료(Prep notes) | OFF | v2 |
| F12 | 텔레프롬프터 | 원고를 내 말 속도에 맞춰 스크롤(인식 텍스트와 원고 정렬) | OFF | v2 |
| F13 | 번역 음성 출력(TTS) | 번역문을 이어폰으로 읽기 (Even에는 없음) | OFF | v2 |
| F14 | 지연 계측 오버레이 | 말 시작/끝→첫 글자/확정까지 ms 표시, 세션 통계 | OFF | MVP |
| F15 | 화면 꺼짐 방지 | Wake Lock | ON | MVP |
| F16 | 오프라인 상태 안내 | 네트워크 끊김 감지·표시, 가능하면 기기 내 받아쓰기로 폴백 | ON | v1 |

## 3. 설정 항목 (모두 사용자 토글/선택, 기기에 저장)

`src/settings/schema.ts`가 단일 진실 원천(single source of truth). 아래 표와 코드가 다르면 코드를 고치고 이 표도 갱신.

| 키 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| mode | 'translate' \| 'conversation' \| 'transcribe' | 'translate' | F1/F2/F3 |
| myLang | Lang | 'ko' | 내 언어(번역 목표) |
| otherLang | Lang \| 'auto' | 'en' | 상대 언어. auto=자동 감지 |
| engine | 'soniox' \| 'webspeech' \| 'mock' | 'webspeech' (키 없을 때) | 엔진 선택 |
| sonioxApiKey | string | '' | 개인용. 기기에만 저장 |
| showOriginal | boolean | true | 원문 줄 표시 |
| showInterim | boolean | true | F5 |
| refine.enabled | boolean | false | F6 |
| refine.model | string | 'claude-opus-5-5' | 'claude-haiku-5-5' 선택 시 더 빠름 |
| refine.apiKey | string | '' | Anthropic 키 |
| diarization | boolean | false | F7 |
| glossary | {src,dst}[] | [] | F8 |
| history.enabled | boolean | true | F9 |
| hud.fontSize | number(px) | 28 | 16–64 |
| hud.maxLines | number | 4 | 1–10 |
| hud.position | 'top'\|'middle'\|'bottom' | 'middle' | |
| hud.color | 'green'\|'white'\|'amber' | 'green' | |
| hud.mirror | boolean | false | 반사판(HUD 거치대)용 좌우 반전 |
| latencyOverlay | boolean | false | F14 |
| wakeLock | boolean | true | F15 |
| tts.enabled | boolean | false | F13 |
| summary.enabled / assist.enabled / teleprompter.enabled | boolean | false | v2 |

## 4. 비기능 요구
- 개인정보: 오디오는 저장하지 않음. 텍스트 기록은 기기(IndexedDB/localStorage)에만. API 키도 기기에만. 서버 없음(MVP).
  - ⚠️ 의료 현장에서 환자 대화에 쓰면 오디오가 외부 API(Soniox, Anthropic)로 전송됨 → 기관 규정 확인 필요. 앱 첫 실행 시 고지.
- 지원 환경: Android Chrome(1순위), iOS Safari(2순위, Web Speech/오디오 제약 ❓ 실기 테스트 필요), 데스크톱 Chrome(개발용).
- 설치형 PWA(홈 화면 추가), 세로/가로 모두.
- 접근성: 큰 글씨, 고대비.

## 5. 성능 목표 (가설, 실측으로 조정)
| 지표 | 정의 | 목표 |
|---|---|---|
| T_first | 발화 시작 → 첫 원문 글자 표시 | < 700 ms ⚠️ |
| T_trans_first | 발화 시작 → 첫 번역 글자 | < 1.5 s ⚠️ |
| T_final | 발화 끝 → 문장 확정 | < 1.0 s ⚠️ |
| T_refine | 확정 → 정밀번역 교체 | < 2.5 s ⚠️ |
수치는 공식 근거가 없는 설계 목표다. F14로 실측해 docs/06_test_plan.md에 기록.

## 6. 범위 밖
- 글라스(BLE) 연동, 앱스토어 배포(후속: Capacitor로 감싸기), 서버 계정 시스템, 오디오 녹음 저장.
