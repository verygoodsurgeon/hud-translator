// Soniox 실시간 STT+번역 엔진. 프로토콜은 docs/05_engines.md §A 참고.
import type { Chunk, Engine, EngineCallbacks, EngineConfig } from '../types';
import { LANGS } from '../settings/schema';
import { openMic, type MicHandle } from '../audio/mic';

const WS_URL = 'wss://stt-rt.soniox.com/transcribe-websocket';
export const SONIOX_MODEL = 'stt-rt-v6';

export interface SonioxToken {
  text: string;
  is_final: boolean;
  speaker?: string;
  language?: string;
  translation_status?: 'none' | 'original' | 'translation';
}

/** 엔진 설정 → Soniox 시작 메시지 (순수 함수, 테스트 대상) */
export function buildStartMessage(cfg: EngineConfig): Record<string, unknown> {
  const all = LANGS.map((l) => l.code);
  const other = cfg.otherLang === 'auto' ? all : [cfg.otherLang];
  const hints = Array.from(new Set(cfg.mode === 'transcribe' ? other : [...other, cfg.myLang]));
  const msg: Record<string, unknown> = {
    model: SONIOX_MODEL,
    audio_format: 'pcm_s16le',
    sample_rate: 16000,
    num_channels: 1,
    language_hints: hints,
    enable_language_identification: true,
    enable_endpoint_detection: true,
    max_endpoint_delay_ms: Math.min(3000, Math.max(500, cfg.endpointDelayMs)),
    enable_speaker_diarization: cfg.diarization,
  };
  const terms = cfg.glossary.map((g) => g.src).filter(Boolean);
  if (terms.length) msg.context = { terms };
  if (cfg.mode === 'translate') {
    msg.translation = { type: 'one_way', target_language: cfg.myLang };
  } else if (cfg.mode === 'conversation') {
    if (cfg.otherLang === 'auto') throw new Error('대화 모드에서는 상대 언어를 지정해야 합니다.');
    msg.translation = { type: 'two_way', language_a: cfg.myLang, language_b: cfg.otherLang };
  }
  return msg;
}

/** Soniox 토큰 배열 → Chunk 배열. '<end>' 토큰은 endpoint 표시로 바꾼다 (순수 함수) */
export function tokensToChunks(tokens: SonioxToken[]): { final: Chunk[]; interim: Chunk[] } {
  const final: Chunk[] = [];
  const interim: Chunk[] = [];
  for (const tk of tokens) {
    const kind: Chunk['kind'] = tk.translation_status === 'translation' ? 'translation' : 'original';
    if (tk.text === '<end>') {
      if (tk.is_final) final.push({ kind: 'original', text: '', final: true, endpoint: true });
      continue;
    }
    const c: Chunk = { kind, text: tk.text, lang: tk.language, speaker: tk.speaker, final: tk.is_final };
    (tk.is_final ? final : interim).push(c);
  }
  return { final, interim };
}

export class SonioxEngine implements Engine {
  private ws: WebSocket | null = null;
  private mic: MicHandle | null = null;
  private cb: EngineCallbacks | null = null;
  private closing: Promise<void> | null = null;
  private resolveClose: (() => void) | null = null;

  async start(cfg: EngineConfig, cb: EngineCallbacks): Promise<void> {
    if (!cfg.sonioxApiKey) throw new Error('Soniox API 키가 필요합니다. 설정에서 입력하세요.');
    this.cb = cb;
    cb.onStatus('connecting');
    const startMsg = buildStartMessage(cfg);
    const ws = new WebSocket(WS_URL, ['soniox-api-key', cfg.sonioxApiKey]);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;
    this.closing = new Promise((r) => (this.resolveClose = r));

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error('Soniox 연결 실패 (키 또는 네트워크 확인)'));
    });
    ws.send(JSON.stringify(startMsg));

    ws.onmessage = (e) => {
      if (typeof e.data !== 'string') return;
      const res = JSON.parse(e.data);
      if (res.error_code) {
        cb.onStatus('error', `Soniox 오류 ${res.error_code}: ${res.error_message ?? ''}`);
        return;
      }
      const { final, interim } = tokensToChunks(res.tokens ?? []);
      cb.onBatch({ final, interim, receivedAt: performance.now() });
      if (res.finished) ws.close();
    };
    ws.onclose = () => {
      this.mic?.stop();
      this.mic = null;
      this.resolveClose?.();
      if (this.cb) this.cb.onStatus('idle');
    };
    ws.onerror = () => cb.onStatus('error', 'Soniox 연결 오류');

    this.mic = await openMic({
      onPcm: (buf) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(buf);
      },
      onSpeechStart: (t) => cb.onSpeechStart?.(t),
      onSpeechEnd: (t) => cb.onSpeechEnd?.(t),
    });
    cb.onStatus('listening');
  }

  async stop(): Promise<void> {
    const ws = this.ws;
    if (!ws) return;
    this.cb?.onStatus('stopping');
    this.mic?.stop();
    this.mic = null;
    if (ws.readyState === WebSocket.OPEN) ws.send(''); // 빈 텍스트 프레임 = 스트림 종료
    // 남은 결과를 최대 3초 기다린다
    await Promise.race([this.closing, new Promise((r) => setTimeout(r, 3000))]);
    if (ws.readyState !== WebSocket.CLOSED) ws.close();
    this.ws = null;
  }
}
