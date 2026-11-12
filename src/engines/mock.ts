// 테스트·데모용 가짜 엔진. 키 없이 실제 엔진처럼 interim → final을 흘려보낸다.
import type { Chunk, Engine, EngineCallbacks, EngineConfig } from '../types';

interface Line { src: string; srcLang: string; dst: string; dstLang: string }

const SCRIPT: Line[] = [
  { src: 'Where is the trauma bay?', srcLang: 'en', dst: '외상 처치실이 어디인가요?', dstLang: 'ko' },
  { src: 'The patient has a blood pressure of eighty over fifty.', srcLang: 'en', dst: '환자 혈압이 80에 50입니다.', dstLang: 'ko' },
  { src: '복부 압통이 있습니다.', srcLang: 'ko', dst: 'There is abdominal tenderness.', dstLang: 'en' },
  { src: 'Let us get a CT scan first.', srcLang: 'en', dst: '먼저 CT를 찍읍시다.', dstLang: 'ko' },
];

export class MockEngine implements Engine {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private cb: EngineCallbacks | null = null;
  /** 단어 간격 ms (테스트에서 줄일 수 있음) */
  constructor(private wordMs = 180) {}

  async start(cfg: EngineConfig, cb: EngineCallbacks): Promise<void> {
    this.cb = cb;
    cb.onStatus('listening');
    let t = 300;
    const at = (ms: number, f: () => void) => this.timers.push(setTimeout(f, ms));
    for (const line of SCRIPT) {
      const words = line.src.split(/(?<=\s)/);
      at(t, () => cb.onSpeechStart?.(performance.now()));
      let acc = '';
      words.forEach((w, i) => {
        t += this.wordMs;
        acc += w;
        const snapshot = acc;
        const last = i === words.length - 1;
        at(t, () => {
          const tr = cfg.mode === 'transcribe' ? null : line.dst.slice(0, Math.ceil((line.dst.length * (i + 1)) / words.length));
          const interim: Chunk[] = last ? [] : [{ kind: 'original', text: snapshot, lang: line.srcLang, final: false }];
          if (tr && !last) interim.push({ kind: 'translation', text: tr, lang: line.dstLang, final: false });
          const final: Chunk[] = last
            ? [
                { kind: 'original', text: snapshot, lang: line.srcLang, final: true, endpoint: true },
                ...(cfg.mode === 'transcribe'
                  ? []
                  : [{ kind: 'translation' as const, text: line.dst, lang: line.dstLang, final: true, endpoint: true }]),
              ]
            : [];
          if (last) cb.onSpeechEnd?.(performance.now() - this.wordMs);
          cb.onBatch({ final, interim, receivedAt: performance.now() });
        });
      });
      t += 900;
    }
    at(t, () => cb.onStatus('idle'));
  }

  async stop(): Promise<void> {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.cb?.onStatus('idle');
  }
}
