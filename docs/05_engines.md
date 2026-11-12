# 05. 엔진 상세

## A. Soniox 실시간 (기본, 권장)
출처: https://docs.soniox.com/api-reference/stt/websocket-api , /translation/stt-translation/rt-translation , /authentication , /authentication/temporary-api-keys (2026-11-12 열람)

### 연결
- URL: `wss://stt-rt.soniox.com/transcribe-websocket`
- 브라우저 인증: WebSocket protocols 목록에 `['soniox-api-key', <키>]` (정확히 2개). 시작 메시지의 `api_key` 필드는 deprecated, **2027-01-15부터 거부**됨.
  - ❓ 서브프로토콜 문자열에 키에 들어가는 문자가 허용되는지 실기 확인. 실패 시 임시 키(아래)를 사용.
- 권장(후속): 서버가 `POST https://api.soniox.com/v1/auth/temporary-api-key` (헤더 `Authorization: Bearer <원본키>`, 본문 `{"usage_type":"transcribe_websocket","expires_in_seconds":300,"single_use":true}`) → 응답 `api_key`를 브라우저에 전달.

### 시작 메시지 (텍스트 프레임, 연결 직후 1회)
```json
{
  "model": "stt-rt-v6",
  "audio_format": "pcm_s16le",
  "sample_rate": 16000,
  "num_channels": 1,
  "language_hints": ["ko", "en"],
  "enable_language_identification": true,
  "enable_endpoint_detection": true,
  "enable_speaker_diarization": false,
  "context": { "terms": ["외상", "trauma bay"] },
  "translation": { "type": "one_way", "target_language": "ko" }
}
```
- 모드 매핑:
  - translate: `{"type":"one_way","target_language": myLang}`, language_hints = [otherLang(auto면 4개 전부), myLang]
  - conversation: `{"type":"two_way","language_a": myLang,"language_b": otherLang}` (otherLang이 auto면 conversation 시작 불가 → UI에서 막기)
  - transcribe: translation 필드 생략
- 용어집: `context.terms`에 원문 단어들, `context.translation_terms`에 쌍. ❓ translation_terms의 정확한 형식은 문서 확인 필요 → 우선 `[{ "source": src, "target": dst }]`로 보내고 오류(error_type) 나면 terms만 보낸다.
- 엔드포인트 세부: `max_endpoint_delay_ms` (500–3000, 기본 2000). 실시간성 위해 **1000**으로 시작, 설정에서 조절 가능하게(v1).

### 오디오 전송
- 바이너리 프레임으로 PCM s16le 16kHz mono. 프레임 크기 권장 ~100ms(3200바이트) ⚠️(문서 수치 아님, 일반적 관행).
- 종료: **빈 문자열 텍스트 프레임** `ws.send("")` → 서버가 남은 결과와 `finished:true`를 보낸 뒤 닫음.
- 수동 확정: `{"type":"finalize"}` 텍스트 메시지(❓ 정확한 형식 확인).
- keepalive: 오디오를 안 보내는 동안 40초 안에 keepalive 필요(❓ 메시지 형식은 /stt/rt/connection-keepalive 확인). MVP는 일시정지 시 연결을 끊고 재연결.

### 응답 (텍스트 프레임 JSON)
```
{ tokens: Token[], final_audio_proc_ms, total_audio_proc_ms, finished?: true,
  error_code?, error_type?, error_message? }
Token: { text, start_ms?, end_ms?, confidence, is_final, speaker?, language?,
         translation_status?: 'none'|'original'|'translation', source_language? }
```
- `is_final:true` 토큰은 **한 번만** 옴 → 누적. `is_final:false`는 매 응답마다 **전부 교체**.
- 번역 토큰: `translation_status==='translation'`, 타임스탬프 없음, 원문과 1:1 대응 아님.
- 원문 토큰: `translation_status` 가 'original' 또는 'none'(번역 대상 아닌 언어).
- 엔드포인트: endpoint detection을 켜면 확정 토큰 끝에 `<end>` 토큰이 온다고 알려져 있음 ⚠️(이번 조사에서 문서 문구는 확인 못 함). 구현: `text === '<end>'`이면 텍스트로 쓰지 말고 직전 Chunk에 `endpoint:true`.
- 에러: `error_code`가 있으면 onStatus('error', error_message) 후 연결 종료됨.

### Chunk 변환 규칙
token → Chunk { kind: translation_status==='translation' ? 'translation' : 'original', text, lang: language, speaker, final: is_final }

## B. Web Speech (무료 폴백)
- `window.SpeechRecognition || window.webkitSpeechRecognition`. 없으면 엔진 선택 목록에서 비활성 표시.
- `continuous = true`, `interimResults = true`, `lang` = BCP-47 (ko-KR, zh-CN, ja-JP, en-US) — schema.ts의 `LANGS[x].bcp47`.
- 한 번에 한 언어만 인식 가능 → translate 모드는 otherLang('auto'면 en), conversation 모드는 **탭으로 화자 전환**(나/상대 버튼) 방식. transcribe는 myLang... 아니라 선택 언어.
- 결과: `event.results[i].isFinal` → final Chunk(endpoint:true), 나머지 → interim Chunk.
- 확정 문장은 `cfg.translator`(Claude)로 번역해 translation Chunk(final) 추가. 키 없으면 번역 생략 + HUD에 "번역 키 필요" 안내.
- `onend`가 자동으로 오면(모바일 Chrome은 수십 초 무음 시 종료) 사용자가 정지하지 않았다면 즉시 `start()` 재호출.
- Chrome은 서버 기반 인식 → 오프라인 불가(MDN). `processLocally` 지원 브라우저면 F16에서 활용 ❓.

## C. Mock (테스트·데모)
- 미리 정의된 대본(ko↔en)을 실제 엔진처럼 interim → final 순서로 흘려보냄. e2e 테스트와 UI 개발용. 키 불필요.

## D. Claude 번역/정밀번역 (translate/claude.ts)
- `@anthropic-ai/sdk` 사용, 브라우저: `new Anthropic({ apiKey, dangerouslyAllowBrowser: true })`.
- `client.messages.stream({ model, max_tokens: 1024, output_config: { effort: 'low' }, system, messages })`
  - Opus 5.5는 thinking 끌 수 없음 → effort 'low'로 지연 최소화. Haiku 5.5도 effort 'low'.
  - temperature 등 샘플링 파라미터 보내지 말 것(최신 모델에서 400).
- 시스템 프롬프트(translate/prompt.ts): "전문 통역사. {from}→{to}. 번역문만 출력. 용어집 준수. 의학 용어는 정확히. 말투는 구어체 유지."
- 응답 `stop_reason === 'refusal'`이면 스트리밍 번역을 유지하고 조용히 무시.
