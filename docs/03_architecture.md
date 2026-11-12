# 03. 아키텍처

## 1. 기술 스택 (결정됨)
- **PWA**: Vite 8 + React 19 + TypeScript (strict). 상태 관리 zustand(+persist). 테스트 vitest(단위) + Playwright(스모크).
- 서버 없음(MVP). API 키는 사용자가 설정 화면에 입력 → localStorage 저장.
  - 후속(v1+): Soniox 임시 키 발급용 초소형 서버(Cloudflare Worker 등)로 원본 키를 기기에서 제거.
- 앱스토어 필요 시: 같은 코드를 Capacitor로 감싼다(범위 밖).
- 왜 PWA인가: 글라스 연동이 빠져 네이티브가 필수 아님. 휴대폰 브라우저에서 바로 실기 테스트 → 지연·정확도 측정 반복이 가장 빠름.

## 2. 데이터 흐름

```
 마이크 ──► audio/mic.ts (getUserMedia, echoCancellation/noiseSuppression,
   │          AudioWorklet로 16kHz mono PCM s16le 변환, RMS로 발화 시작 감지)
   │
   ├──► engines/soniox.ts ──(WebSocket wss://stt-rt.soniox.com/transcribe-websocket)──┐
   │                                                                                 │
   └──► engines/webspeech.ts (브라우저 SpeechRecognition, 자체 마이크 사용)            │
              └─► translate/claude.ts (확정 문장만 번역)                              │
                                                                                     ▼
                                     EngineBatch { final: Chunk[], interim: Chunk[] }
                                                       │
                                                       ▼
                         core/transcript.ts  applyBatch(state, batch)  (순수 함수)
                                                       │
                     ┌─────────────────────────────────┼──────────────────────┐
                     ▼                                 ▼                      ▼
     core/sentences.ts 문장 분리          refine (F6): 확정 원문 문장 →      history (F9)
                     │                    translate/claude.ts 정밀 번역       IndexedDB/
                     ▼                                 │                      localStorage
           ui/Hud.tsx, ui/ConversationView.tsx ◄───────┘
           ui/LatencyOverlay.tsx ◄── core/latency.ts
```

## 3. 핵심 타입 (src/types.ts — 이 정의를 바꾸면 이 문서도 갱신)

```ts
export type Lang = 'ko' | 'zh' | 'ja' | 'en';

/** 엔진이 내보내는 최소 단위. 원문/번역 모두 Chunk로 통일 */
export interface Chunk {
  kind: 'original' | 'translation';
  text: string;
  lang?: string;        // 엔진이 알려주면 채움 (Soniox token.language)
  speaker?: string;     // 화자 분리 켰을 때
  final: boolean;
  endpoint?: boolean;   // 이 Chunk 뒤에서 발화가 끝났음(문장 경계 강제)
}

/** 엔진 → 코어로 한 번에 전달되는 묶음.
 *  final: 새로 확정된 조각(누적), interim: 아직 미확정(매번 통째로 교체) */
export interface EngineBatch { final: Chunk[]; interim: Chunk[]; receivedAt: number; }

export type EngineStatus = 'idle' | 'connecting' | 'listening' | 'stopping' | 'error';

export interface Engine {
  start(cfg: EngineConfig, cb: EngineCallbacks): Promise<void>;
  stop(): Promise<void>;          // 남은 결과를 마저 받고 종료
}
export interface EngineCallbacks {
  onBatch(b: EngineBatch): void;
  onStatus(s: EngineStatus, message?: string): void;
  onSpeechStart?(t: number): void; // 지연 계측용
}
export interface EngineConfig {
  mode: 'translate' | 'conversation' | 'transcribe';
  myLang: Lang; otherLang: Lang | 'auto';
  diarization: boolean; glossary: { src: string; dst: string }[];
  sonioxApiKey?: string;
  translator?: (text: string, from: string | undefined, to: Lang) => Promise<string>; // webspeech용
}
```

## 4. 코어 상태 (core/transcript.ts)

```ts
interface TranscriptState {
  finals: StoredChunk[];   // 확정 조각. 인접한 같은 (kind, lang, speaker)는 text를 이어 붙여 병합
  interim: Chunk[];        // 최신 미확정 조각
}
interface StoredChunk extends Chunk { id: number; at: number; }  // at = 확정 수신 시각(ms)
```
- `applyBatch(state, batch)`: finals 뒤에 batch.final 병합 추가, interim은 batch.interim으로 교체. **불변(immutable) 순수 함수**. 단위 테스트 필수.
- `endpoint: true`인 조각 뒤에는 병합하지 않고 새 조각을 시작(문장 경계 유지).
- 표시용 선택자(selector):
  - `streamText(state, kind, filter)` → {final: string, interim: string}
  - 대화 모드: 아래(나) = `kind==='translation' && lang===myLang` + 내가 말한 원문은 숨김 옵션, 위(상대) = `lang===otherLang`인 번역.
  - 받아쓰기 모드: kind==='original'만.

## 5. 문장 분리 (core/sentences.ts)
- 입력: 확정 원문 텍스트. 출력: `{id, text, lang}[]`.
- 경계: `. ? ! 。 ？ ！ …` 및 줄바꿈, endpoint 플래그. 한국어/일본어/중국어 문장부호 포함.
- id = `${chunkId}:${문장번호}` 처럼 **같은 입력엔 같은 id**(정밀번역 결과 캐시 키).

## 6. 정밀 번역 F6 (translate/claude.ts)
- 확정 원문 문장마다 1회 호출. 직전 3문장(원문+번역)을 문맥으로, 용어집을 규칙으로 넣는다.
- SDK: `@anthropic-ai/sdk`, `new Anthropic({ apiKey, dangerouslyAllowBrowser: true })`, `client.messages.stream(...)`로 토큰이 오는 대로 표시.
- 모델 기본값 `claude-opus-5-5`(effort 'low'), 설정에서 `claude-haiku-5-5` 선택 가능(더 빠르고 저렴).
- 출력은 번역문만. 동시 요청 최대 2개, 이전 문장 순서대로 표시.
- HUD 표시 규칙: 정밀번역이 도착한 문장은 그것으로, 아직이면 스트리밍 번역을 그대로.
  (Soniox 번역 토큰과 원문 문장은 1:1 대응이 아니므로, 정밀번역 모드에서는 "확정 문장 = 정밀번역 목록 + 맨 아래에 현재 스트리밍 꼬리" 방식으로 그린다.)

## 7. 엔진별 세부 → docs/05_engines.md

## 8. 지연 계측 (core/latency.ts, F14)
- `speechStart`: mic.ts의 RMS 임계값 돌파 시각(또는 WebSpeech `speechstart`).
- `firstOriginal`: 그 이후 첫 원문 Chunk(interim 포함) 수신 시각.
- `firstTranslation`: 첫 번역 Chunk 수신 시각.
- `final`: 해당 발화의 endpoint/final 수신 시각.
- 발화별 기록 → 최근 20개 중앙값(p50)/p90을 오버레이에 표시. `performance.now()` 사용.

## 9. 디렉터리
```
src/
  main.tsx  App.tsx  styles.css  types.ts
  settings/schema.ts   # 언어 목록, 설정 타입, 기본값 (단일 진실 원천)
  settings/store.ts    # zustand persist (localStorage 키: hudtr.settings.v1)
  core/transcript.ts  core/sentences.ts  core/latency.ts
  engines/index.ts  engines/soniox.ts  engines/webspeech.ts  engines/mock.ts
  audio/mic.ts         # public/pcm-worklet.js 로드
  translate/claude.ts  translate/prompt.ts
  session/useSession.ts  # 엔진 시작/정지, store 갱신, refine 연결
  ui/Hud.tsx  ui/ConversationView.tsx  ui/Controls.tsx  ui/SettingsPanel.tsx
  ui/HistoryPanel.tsx  ui/LatencyOverlay.tsx
public/ manifest.webmanifest  sw.js  pcm-worklet.js  icon.svg
tests/ (vitest: *.test.ts는 src 옆에), e2e/smoke.spec.ts
```

## 10. 코딩 규칙 (이어받는 모델용)
- 코어(core/*)는 React·브라우저 API 의존 금지 → 단위 테스트 가능하게.
- 새 기능은 반드시 settings/schema.ts에 토글을 먼저 추가하고 기본값 OFF.
- 엔진 추가 = engines/에 Engine 구현 + engines/index.ts 등록. UI는 손대지 않아도 되게.
- 모든 비동기 오류는 onStatus('error', 메시지)로 올리고 HUD 상단에 한 줄 표시.
- 키·기록은 절대 로그(console)로 출력하지 않는다.
