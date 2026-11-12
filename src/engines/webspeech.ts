// 브라우저 내장 음성인식(Web Speech API) 엔진. 무료. 번역은 cfg.translator(Claude)로 확정 문장만.
// 한 번에 한 언어만 인식 가능 → 대화 모드는 setSpeaker('me'|'other')로 전환.
import type { Chunk, Engine, EngineCallbacks, EngineConfig, Lang } from '../types';
import { langInfo } from '../settings/schema';

// 표준 타입 정의가 lib.dom에 없을 수 있어 최소한으로 선언
interface SRAlternative { transcript: string }
interface SRResult { isFinal: boolean; 0: SRAlternative; length: number }
interface SREvent { resultIndex: number; results: { length: number; [i: number]: SRResult } }
interface SR {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export function getSpeechRecognition(): (new () => SR) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const isWebSpeechSupported = () => typeof window !== 'undefined' && !!getSpeechRecognition();

/** 모드·화자에 따른 (인식 언어, 번역 목표) */
export function langsFor(cfg: EngineConfig, who: 'me' | 'other'): { src: Lang; dst: Lang | null } {
  const other: Lang = cfg.otherLang === 'auto' ? (cfg.mode === 'transcribe' ? cfg.myLang : 'en') : cfg.otherLang;
  if (cfg.mode === 'transcribe') return { src: other, dst: null };
  if (cfg.mode === 'conversation' && who === 'me') return { src: cfg.myLang, dst: other };
  return { src: other, dst: cfg.myLang };
}

export class WebSpeechEngine implements Engine {
  private rec: SR | null = null;
  private cfg: EngineConfig | null = null;
  private cb: EngineCallbacks | null = null;
  private running = false;
  private who: 'me' | 'other' = 'other';
  private queue: Promise<void> = Promise.resolve();

  async start(cfg: EngineConfig, cb: EngineCallbacks): Promise<void> {
    const Ctor = getSpeechRecognition();
    if (!Ctor) throw new Error('이 브라우저는 내장 음성인식을 지원하지 않습니다. Soniox 엔진을 쓰세요.');
    this.cfg = cfg;
    this.cb = cb;
    this.running = true;
    this.who = 'other';
    cb.onStatus('connecting');
    this.spawn(Ctor);
    cb.onStatus('listening');
  }

  private spawn(Ctor: new () => SR) {
    const cfg = this.cfg!;
    const cb = this.cb!;
    const { src, dst } = langsFor(cfg, this.who);
    const rec = new Ctor();
    rec.lang = langInfo(src)?.bcp47 ?? src;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onspeechstart = () => cb.onSpeechStart?.(performance.now());
    rec.onspeechend = () => cb.onSpeechEnd?.(performance.now());
    rec.onresult = (e) => {
      const final: Chunk[] = [];
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript;
        if (r.isFinal) {
          if (text.trim()) final.push({ kind: 'original', text: text.trim(), lang: src, final: true, endpoint: true });
        } else interimText += text;
      }
      const interim: Chunk[] = interimText ? [{ kind: 'original', text: interimText, lang: src, final: false }] : [];
      cb.onBatch({ final, interim, receivedAt: performance.now() });
      if (dst && cfg.translator) for (const c of final) this.translate(c.text, src, dst);
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      cb.onStatus('error', `음성인식 오류: ${e.error}`);
      if (e.error === 'not-allowed') this.running = false;
    };
    rec.onend = () => {
      // 모바일 브라우저는 무음이 길면 스스로 끝난다 → 사용자가 멈춘 게 아니면 다시 시작
      if (this.running && this.rec === rec) {
        try {
          rec.start();
        } catch {
          this.spawn(Ctor);
        }
      }
    };
    this.rec = rec;
    rec.start();
  }

  /** 번역 결과가 순서대로 붙도록 직렬 큐 사용 */
  private translate(text: string, src: Lang, dst: Lang) {
    const cfg = this.cfg!;
    const cb = this.cb!;
    this.queue = this.queue.then(async () => {
      try {
        const out = await cfg.translator!(text, src, dst);
        if (out.trim())
          cb.onBatch({
            final: [{ kind: 'translation', text: out.trim(), lang: dst, final: true, endpoint: true }],
            interim: [],
            receivedAt: performance.now(),
          });
      } catch (err) {
        cb.onStatus('error', `번역 실패: ${(err as Error).message}`);
      }
    });
  }

  setSpeaker(who: 'me' | 'other') {
    if (who === this.who || !this.running) {
      this.who = who;
      return;
    }
    this.who = who;
    const old = this.rec;
    this.rec = null;
    old?.abort();
    const Ctor = getSpeechRecognition();
    if (Ctor) this.spawn(Ctor);
  }

  async stop(): Promise<void> {
    this.running = false;
    this.cb?.onStatus('stopping');
    this.rec?.stop();
    this.rec = null;
    await this.queue;
    this.cb?.onStatus('idle');
  }
}
