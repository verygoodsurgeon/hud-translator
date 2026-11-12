import { describe, expect, it } from 'vitest';
import { applyBatch, emptyTranscript, finalSentences, joinText, selectLines } from './transcript';
import { splitSentences } from './sentences';
import { LatencyTracker, percentile } from './latency';
import type { Chunk } from '../types';

const o = (text: string, final = true, extra: Partial<Chunk> = {}): Chunk => ({ kind: 'original', text, final, lang: 'en', ...extra });
const t = (text: string, final = true, extra: Partial<Chunk> = {}): Chunk => ({ kind: 'translation', text, final, lang: 'ko', ...extra });

describe('splitSentences', () => {
  it('splits en/ko/ja/zh', () => {
    expect(splitSentences('Hello there. How are you').map((p) => p.complete)).toEqual([true, false]);
    expect(splitSentences('痛いですか。いつから？').length).toBe(2);
    expect(splitSentences('请问洗手间在哪里？我需要水').map((p) => p.complete)).toEqual([true, false]);
    expect(splitSentences('괜찮으세요? 네.').length).toBe(2);
  });
  it('keeps decimals', () => {
    expect(splitSentences('BP is 80.5 now.').length).toBe(1);
  });
});

describe('applyBatch', () => {
  it('accumulates finals and replaces interim', () => {
    let s = emptyTranscript();
    s = applyBatch(s, { final: [o('Hello ')], interim: [o('wor', false)], receivedAt: 1 });
    s = applyBatch(s, { final: [o('world.')], interim: [], receivedAt: 2 });
    expect(s.finals).toHaveLength(1);
    expect(s.finals[0].text).toBe('Hello world.');
    expect(s.interim).toHaveLength(0);
  });
  it('endpoint starts a new chunk', () => {
    let s = emptyTranscript();
    s = applyBatch(s, { final: [o('Hi'), { kind: 'original', text: '', final: true, endpoint: true }], interim: [], receivedAt: 1 });
    s = applyBatch(s, { final: [o('Bye')], interim: [], receivedAt: 2 });
    expect(s.finals.map((c) => c.text)).toEqual(['Hi', 'Bye']);
    expect(s.finals[0].endpoint).toBe(true);
  });
  it('separates kinds', () => {
    let s = emptyTranscript();
    s = applyBatch(s, { final: [o('Hello. '), t('안녕하세요. ')], interim: [], receivedAt: 1 });
    const tr = selectLines(s, (c) => c.kind === 'translation', 4);
    expect(tr.map((l) => l.text)).toEqual(['안녕하세요.']);
  });
});

describe('selectLines', () => {
  it('limits lines and appends interim', () => {
    let s = emptyTranscript();
    s = applyBatch(s, { final: [o('One. Two. Three. Four')], interim: [o(' five', false)], receivedAt: 1 });
    const lines = selectLines(s, (c) => c.kind === 'original', 2);
    expect(lines.map((l) => l.text)).toEqual(['Three.', 'Four five']);
    expect(lines[1].interim).toBe(true);
  });
});

describe('finalSentences', () => {
  it('returns only complete sentences with stable ids', () => {
    let s = emptyTranscript();
    s = applyBatch(s, { final: [o('One. Two')], interim: [], receivedAt: 1 });
    const a = finalSentences(s, () => true);
    expect(a.map((x) => x.text)).toEqual(['One.']);
    s = applyBatch(s, { final: [o(' more.')], interim: [], receivedAt: 2 });
    const b = finalSentences(s, () => true);
    expect(b.map((x) => x.text)).toEqual(['One.', 'Two more.']);
    expect(b[0].id).toBe(a[0].id);
  });
  it('endpoint completes an unterminated sentence', () => {
    let s = emptyTranscript();
    s = applyBatch(s, { final: [o('no punctuation', true, { endpoint: true })], interim: [], receivedAt: 1 });
    expect(finalSentences(s, () => true)).toHaveLength(1);
  });
});

describe('joinText', () => {
  it('joins with or without spaces', () => {
    expect(joinText('Hello', 'world')).toBe('Hello world');
    expect(joinText('痛い', 'です')).toBe('痛いです');
    expect(joinText('Hi', '.')).toBe('Hi.');
  });
});

describe('latency', () => {
  it('computes percentiles', () => {
    expect(percentile([1, 2, 3, 4], 50)).toBe(2);
    expect(percentile([], 50)).toBeNull();
  });
  it('tracks an utterance', () => {
    const lt = new LatencyTracker();
    lt.speechStart(100);
    lt.onBatch({ final: [], interim: [o('he', false)], receivedAt: 400 });
    lt.onBatch({ final: [], interim: [t('안', false)], receivedAt: 900 });
    lt.speechEnd(1500);
    lt.onBatch({ final: [o('hello', true, { endpoint: true })], interim: [], receivedAt: 2000 });
    const st = lt.stats();
    expect(st.n).toBe(1);
    expect(st.firstOriginal.p50).toBe(300);
    expect(st.firstTranslation.p50).toBe(800);
    expect(st.final.p50).toBe(500);
  });
});
