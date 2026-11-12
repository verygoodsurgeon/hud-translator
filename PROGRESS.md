# PROGRESS — 진행 상태 (이어받는 사람은 이 파일부터)

마지막 갱신: 2026-11-12 (설계·MVP 작성 세션)

## 현재 상태 요약
- 설계 문서 완료: docs/01~06.
- MVP 코드 동작: 번역/대화/받아쓰기 모드, HUD 표시 설정, 엔진 3종(Soniox·브라우저 내장·데모), 정밀번역(F6), 용어집, 기록, 지연 표시, 화면 꺼짐 방지, PWA 셸.
- 검증: `npm test` 17개 통과, `npm run e2e` 3개 통과(데모 엔진), `npm run build` 성공.
- **실제 마이크·실제 API로는 아직 시험하지 않았다.** (이 개발 환경에 마이크·키 없음) → 아래 T1이 최우선.
- 저장소: verygoodsurgeon/hud-translator. 배포는 T1 참고.

## 작업 목록 (위에서부터 순서대로)
상태: [x] 완료 · [ ] 할 일 · [~] 진행 중 · [?] 사용자 결정 필요

### MVP
- [x] T0 설계 문서 (docs/)
- [x] T0.1 코어: transcript/sentences/latency + 단위 테스트
- [x] T0.2 엔진: soniox.ts, webspeech.ts, mock.ts
- [x] T0.3 UI: Hud, ConversationHud, Controls, SettingsPanel, HistoryPanel, LatencyOverlay
- [x] T0.4 PWA: manifest, sw.js, icon
- [~] T1 호스팅: 저장소 https://github.com/verygoodsurgeon/hud-translator (Public, 2026-11-12 사용자 생성). main에 push하면 .github/workflows/pages.yml이 테스트·빌드 후 GitHub Pages에 배포. 예상 주소 https://verygoodsurgeon.github.io/hud-translator/ (Pages 소스를 'GitHub Actions'로 설정해야 함).
  - 빌드 산출물 `dist/`는 정적 파일이라 어디든 올리면 됨(`base: './'` 설정됨).
- [ ] T2 실기 시험 (docs/06_test_plan.md 표 채우기): Android Chrome + Soniox 키, iPhone Safari.
  - 확인할 것: Soniox 브라우저 인증(서브프로토콜 방식) 성공 여부, `<end>` 토큰 실제 수신 여부, 번역 토큰의 `language` 필드가 목표 언어로 오는지(대화 모드 화면 분리가 이것에 의존).
  - 실패 시: soniox.ts에서 응답 원문을 개발자 콘솔에 잠시 출력해 형식 확인(키는 출력 금지).
- [ ] T3 Soniox 보완 (docs/05_engines.md §A의 ❓ 항목)
  - keepalive 메시지(40초 무음 대비), `finalize` 메시지, `context.translation_terms` 형식 → docs.soniox.com 확인 후 구현
  - 용어집 쌍을 translation_terms로 전달
- [ ] T4 번들 줄이기: translate/claude.ts를 `import()` 동적 로드 (현재 500kB 경고)
- [ ] T5 F16 오프라인 안내: `navigator.onLine` + `online/offline` 이벤트 → 상단 바 표시, Soniox 연결 끊김 시 자동 재연결 1회

### v1
- [ ] T6 Soniox 임시 키 서버(Cloudflare Worker 등): 원본 키를 기기에서 제거. docs/05 §A "권장(후속)"
- [ ] T7 화자 구분 UI 개선(색 구분), 대화 모드에서 내 원문도 작게 표시 옵션
- [ ] T8 iOS Safari 대응 점검(AudioContext 재개, webkitSpeechRecognition 동작)

### v2 (설정에 "준비 중"으로 이미 토글 자리 있음: settings/schema.ts)
- [ ] T9 F13 번역 음성 읽기: `speechSynthesis`로 확정 번역 문장 읽기 (lang = LANGS[x].bcp47)
- [ ] T10 F10 대화 요약: 세션 종료 시 Claude로 요약 → 기록에 저장
- [ ] T11 F11 대화 보조 + 사전 자료(Prep notes): 사용자가 붙여넣은 자료 + 최근 대화로 힌트 1~2줄 표시
- [ ] T12 F12 텔레프롬프터: 원고 입력 → 인식된 원문과 정렬해 현재 위치 스크롤
- [ ] T13 앱스토어 배포: Capacitor로 감싸기, 오프라인 비상 번역(Apple Translation / ML Kit) 검토

## 결정 기록 (바꾸려면 사용자와 상의)
- 2026-11-12 글라스 연동 없음, 휴대폰 단독 (사용자)
- 2026-11-12 PWA 먼저 (사용자 선택)
- 2026-11-12 기본 엔진 Soniox, 정확도 보강은 Claude 2단계 (설계자 판단, 근거 docs/01 §4)
- 언어 1차: ko, zh, ja, en (사용자)

## 알려진 한계·주의
- Soniox 지연 수치는 공식 공개값이 없음 → 앱의 지연 표시로 실측해야 함.
- Web Speech는 한 번에 한 언어만 → 대화 모드는 "내가/상대가 말함" 버튼으로 전환.
- 의료 대화: 음성이 외부 서버로 감. 첫 실행 안내에 고지함.
