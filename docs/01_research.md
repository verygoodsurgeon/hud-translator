# 01. 조사 요약 (2026-11-12 기준)

> 목적: Even Realities 글라스의 "최신 번역 관련 기능"과 사용자 반응을 정리하고, 이를 **휴대폰 단독 앱**의 요구사항으로 바꾼다.
> 표기: ✅ = 출처로 확인됨, ⚠️ = 추정/간접, ❓ = 확인 필요.
> 선행 조사 문서(Claude Doc): https://claude.ai/artifact/8Y6miwUv99KbsT5HRn87yM

## 1. 범위 결정 (사용자 지시, 2026-11-12)

- 글라스 기기 연동 **없음**. 휴대폰 마이크가 수신기, 휴대폰 화면에 "스마트 글라스 화면처럼"(검은 바탕 + 녹색 단색 자막 HUD) 표시.
- Even의 브랜드명·로고·UI를 복제하지 않는다. 기능만 참고한 독자 앱.

## 2. Even G2의 번역·대화 관련 기능 (복제 대상 "기능" 목록)

| 기능 | 내용 | 근거 |
|---|---|---|
| Translate (번역 자막) | 원문과 번역문을 동시에 표시, "입력언어 → 출력언어" 방향 표시. 실행 전에 언어를 정해야 함 | ✅ support.evenrealities.com/hc/en-us/articles/14273831059983 |
| 마이크 선택 | 휴대폰 마이크 / 글라스 마이크 | ✅ 동일 |
| 언어 | 표시 가능 29개 + 앱에서만 6개(총 약 35). 한국어·일본어·중국어(간체/번체)·영어·광둥어 포함 | ✅ 동일 |
| 양방향 대화 | 상대방은 휴대폰 화면을 보는 방식 | ⚠️ 선행 조사(공식 문서 기반) |
| Transcribe (받아쓰기/실시간 자막) | 번역과 별개 기능 | ✅ evenrealities.com/blogs/buyers-guide/ai-translation-glasses |
| Conversate (대화 보조) | 대화를 듣고 요점·맥락을 파악해 제안 표시 | ✅ businessinsider.jp 2511 기사 |
| Prep Notes | 미리 올린 자료를 바탕으로 대화 중 답변 힌트·핵심 사실 표시 (2026-03) | ✅ T3 기사(inkl) |
| Conversate Pro / Knowledge Base | 사용자가 고른 자료만 기억해 대화에 활용 (G2 v2.4.0, 2026-10, 베타) | ✅ 9to5google 2026-10-26 |
| Teleprompter | 말하는 속도에 맞춰 원고 자동 스크롤 | ✅ businessinsider.jp |
| 요약/기록 | AI 요약, Conversate 기록 클라우드 동기화(EU GCP) | ✅ 9to5google, WIRED 요약(neohear) |
| TTS(음성 출력) | 없음(자막만) | ✅ 선행 조사 |

❓ 확인 못 한 것: 번역 처리 위치(클라우드/기기), 오프라인 지원, 지연(ms) 수치, 화자 분리 여부, 번역 기록 저장 여부.
⚠️ 여러 리뷰가 "인터넷 연결 필요"라고 씀(WIRED 요약, HearingTracker 사용자) → 클라우드 처리로 추정.

## 3. 사용자·리뷰어 반응

### 좋았던 점
- 자막 정확도: 1:1 대화 "exactly accurate", 7명이 겹쳐 말하는 자리에서도 "highly accurate" (청각장애 사용자, HearingTracker 포럼) ✅
- WIRED: 캡션 글라스 중 "clear top pick", 구독 없이 번역·받아쓰기·요약 제공 ✅ (neohear 재게시)
- 일본 CEO 인터뷰를 통역 없이 진행 가능 (MoguraVR) ✅
- Prep Notes 사용 시 "AI cues are much more accurate", 실시간 지원이 빨라짐 (Tom's Guide 2026-03) ✅
- G1 번역: "몇 초 걸리지만 정확, 오역 드묾" (TechRadar G1, 2025-05) ✅

### 불만·한계 (= 우리 앱이 개선할 점)
| 불만 | 출처 | 우리 앱의 대응 |
|---|---|---|
| 번역 지연이 길어 "통역"이라 부르기 어렵다 | Business Insider Japan, MoguraVR, Even 자체 가이드도 "noticeable lag" 인정 | 스트리밍 엔진(토큰 단위 중간 결과) + 중간결과 즉시 표시 + 지연 측정 표시 |
| 지연 수치 미공개 | 모든 출처 | 앱 안에 **지연 계측 오버레이**(말 끝→자막 확정 ms) |
| 소음·다화자 환경에서 인식률 저하 | braindetox 리뷰 | 화자 분리 옵션, 노이즈 억제(브라우저 constraints), 용어집 |
| 화자 구분 표시 없음 (요청했으나 "아직") | HearingTracker (2026-07) | **화자 라벨/색상 토글** |
| 글자 크기·위치·줄 수 조절 부족 (경쟁제품 AirCaps는 가능) | HearingTracker | 글자 크기·줄 수·위치·원문표시 모두 설정 |
| 인터넷 없으면 동작 안 함 | HearingTracker 사용자(반품) | 오프라인 시 상태 명확 표시, 받아쓰기는 기기 내 인식(가능한 브라우저) 폴백 — ❓ 브라우저별 지원 확인 필요 |
| 자막을 계속 읽느라 눈맞춤이 끊김 | HearingTracker, MoguraVR | 짧은 줄·큰 글씨, "번역만 보기" 모드, 선택적 TTS(이어폰) |
| 가격·구독 | Tom's Guide, TechRadar | 무료 엔진 경로 제공(Web Speech), 유료 엔진은 사용자 키 |

## 4. 실시간 엔진 조사 (휴대폰 웹앱 기준)

| 후보 | 방식 | ko/zh/ja/en | 장점 | 한계 | 근거 |
|---|---|---|---|---|---|
| **Soniox** (stt-rt-v6) | WebSocket, STT+번역 단일 토큰 스트림, one_way/two_way | ✅ 지원 언어표에 ko, zh, ja, en | 문장 끝나기 전 번역 토큰, 엔드포인트 감지, 화자 분리, 언어 식별, 브라우저용 임시 키, `@soniox/client` 웹 SDK | 지연 ms 공식 수치 없음, 문서에 "Preview" 표기, 실시간 약 $0.18/h(마케팅 페이지) | docs.soniox.com/api-reference/stt/websocket-api, /translation/stt-translation/rt-translation, /authentication/temporary-api-keys |
| Web Speech API | 브라우저 내장 인식(Chrome은 서버 처리) | ⚠️ 브라우저 의존 | 무료, 키 불필요, interimResults | 번역 없음, 브라우저마다 지원 다름(Baseline 아님), iOS 동작 ❓ | MDN SpeechRecognition |
| AssemblyAI + LLM Gateway | WebSocket, 확정 turn 단위 번역 | ❓ | STT 정확도 높음(영어 WER 2.2%, Coval) | 번역은 확정 후에만 → 단어 단위 표시 불가 | assemblyai.com/blog/best-real-time-speech-translation-apis |
| Chrome Translator API | 기기 내 텍스트 번역 | ✅ ko, ja, zh, en | 무료·오프라인 | **모바일 미지원** | developer.chrome.com/docs/ai/translator-api |
| Claude API (LLM) | 확정 문장 재번역/교정 | ✅ | 문맥·용어집 반영 정확도 | 수백 ms~수 초 추가 ⚠️(측정 필요) | Anthropic SDK |

결론(설계 결정):
1. **기본 엔진 = Soniox 실시간 번역** (실시간성 최우선, 양방향 지원).
2. **무료 엔진 = Web Speech 인식 + (선택) LLM 번역** — 키 없이도 받아쓰기는 됨.
3. **정확도 보강 = 2단계 표시**: 스트리밍 초벌 번역을 즉시 보여주고, 문장이 확정되면 (옵션) Claude가 문맥·용어집으로 다듬은 번역으로 교체.
4. 공식 지연 수치가 어디에도 없으므로 **앱이 직접 지연을 측정·표시**한다.

## 5. 출처 목록
- Even 지원 문서: https://support.evenrealities.com/hc/en-us/articles/14273831059983
- Even 번역 글라스 가이드: https://www.evenrealities.com/blogs/buyers-guide/ai-translation-glasses
- WIRED 요약(NeoHear): https://www.neohear.com/2026/06/01/wired-i-tried-the-best-captioning-smart-glasses-and-only-one-leads-the-pack/
- MoguraVR: https://www.moguravr.com/even-g2-translate-inter-view/
- braindetox 리뷰: https://braindetox.kr/en/posts/even_g2_ar_glasses_review_2026.html
- Business Insider Japan: https://www.businessinsider.jp/article/2511-even-g2-smart-glasses-translation/
- 9to5Google (v2.4.0): https://9to5google.com/2026/10/26/even-realities-g2-glasses-update-adds-knowledge-based/
- T3/inkl (Prep Notes): https://www.inkl.com/news/meta-ray-ban-rival-even-realities-brings-real-time-conversation-coaching-to-smart-glasses
- HearingTracker 포럼: https://forum.hearingtracker.com/t/even-realities-review/111040
- TechRadar G1: https://www.techradar.com/computing/even-realities-g1-review
- TechRadar G2 (CES 2026): https://www.techradar.com/computing/virtual-reality-augmented-reality/i-tried-even-realities-g2-display-smart-glasses-and-now-i-cant-stop-thinking-about-their-minimalist-approach
- Tom's Guide G2: https://www.tomsguide.com/computing/smart-glasses/i-fed-my-tamagotchi-looked-like-a-d1-athlete-and-fact-checked-my-boss-my-time-with-even-g2s-secret-smart-glasses-app-store
- Soniox 문서: https://docs.soniox.com/
- AssemblyAI 비교: https://www.assemblyai.com/blog/best-real-time-speech-translation-apis
- Coval STT 벤치마크: https://www.coval.ai/blog/best-speech-to-text-providers-in-2026-independent-benchmarks-and-how-to-choose/
- Chrome Translator API: https://developer.chrome.com/docs/ai/translator-api
- MDN SpeechRecognition: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
