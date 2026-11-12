// 지연 계측 (F14). 시간은 모두 performance.now() 기준 ms. 순수 클래스.
import type { EngineBatch } from '../types';

interface Utterance {
  start: number;
  end?: number;
  firstOriginal?: number;
  firstTranslation?: number;
  final?: number;
}

export interface Pct {
  p50: number | null;
  p90: number | null;
}

export interface LatencyStats {
  n: number;
  firstOriginal: Pct; // 발화 시작 → 첫 원문 글자
  firstTranslation: Pct; // 발화 시작 → 첫 번역 글자
  final: Pct; // 발화 끝 → 확정(endpoint)
}

export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return Math.round(s[idx]);
}

export class LatencyTracker {
  private cur: Utterance | null = null;
  private done: Utterance[] = [];
  constructor(private keep = 20) {}

  speechStart(t: number) {
    if (!this.cur) this.cur = { start: t };
  }

  speechEnd(t: number) {
    if (this.cur && this.cur.end === undefined) this.cur.end = t;
  }

  onBatch(b: EngineBatch) {
    const u = this.cur;
    if (!u) return;
    const all = [...b.final, ...b.interim];
    if (u.firstOriginal === undefined && all.some((c) => c.kind === 'original' && c.text.trim()))
      u.firstOriginal = b.receivedAt;
    if (u.firstTranslation === undefined && all.some((c) => c.kind === 'translation' && c.text.trim()))
      u.firstTranslation = b.receivedAt;
    if (b.final.some((c) => c.kind === 'original' && c.endpoint)) {
      u.final = b.receivedAt;
      this.done.push(u);
      if (this.done.length > this.keep) this.done.shift();
      this.cur = null;
    }
  }

  /** 번역이 endpoint 뒤에 도착하는 경우를 위해 마지막 완료 발화에도 번역 시각을 채운다 */
  lateTranslation(t: number) {
    const u = this.done[this.done.length - 1];
    if (u && u.firstTranslation === undefined) u.firstTranslation = t;
  }

  stats(): LatencyStats {
    const d = this.done;
    const pick = (f: (u: Utterance) => number | undefined): Pct => {
      const v = d.map(f).filter((x): x is number => x !== undefined && x >= 0);
      return { p50: percentile(v, 50), p90: percentile(v, 90) };
    };
    return {
      n: d.length,
      firstOriginal: pick((u) => (u.firstOriginal !== undefined ? u.firstOriginal - u.start : undefined)),
      firstTranslation: pick((u) => (u.firstTranslation !== undefined ? u.firstTranslation - u.start : undefined)),
      final: pick((u) => (u.final !== undefined && u.end !== undefined ? u.final - u.end : undefined)),
    };
  }

  reset() {
    this.cur = null;
    this.done = [];
  }
}
