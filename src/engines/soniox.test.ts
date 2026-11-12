import { describe, expect, it } from 'vitest';
import { buildStartMessage, tokensToChunks } from './soniox';
import type { EngineConfig } from '../types';

const base: EngineConfig = { mode: 'translate', myLang: 'ko', otherLang: 'en', diarization: false, glossary: [], endpointDelayMs: 1000 };

describe('buildStartMessage', () => {
  it('one-way translation', () => {
    const m = buildStartMessage(base);
    expect(m.translation).toEqual({ type: 'one_way', target_language: 'ko' });
    expect(m.language_hints).toEqual(['en', 'ko']);
    expect(m.model).toBe('stt-rt-v6');
  });
  it('two-way conversation', () => {
    const m = buildStartMessage({ ...base, mode: 'conversation', otherLang: 'ja' });
    expect(m.translation).toEqual({ type: 'two_way', language_a: 'ko', language_b: 'ja' });
  });
  it('transcribe has no translation and auto hints all langs', () => {
    const m = buildStartMessage({ ...base, mode: 'transcribe', otherLang: 'auto' });
    expect(m.translation).toBeUndefined();
    expect((m.language_hints as string[]).length).toBe(4);
  });
  it('conversation requires explicit other language', () => {
    expect(() => buildStartMessage({ ...base, mode: 'conversation', otherLang: 'auto' })).toThrow();
  });
  it('clamps endpoint delay and adds glossary terms', () => {
    const m = buildStartMessage({ ...base, endpointDelayMs: 100, glossary: [{ src: 'trauma bay', dst: '외상 처치실' }] });
    expect(m.max_endpoint_delay_ms).toBe(500);
    expect(m.context).toEqual({ terms: ['trauma bay'] });
  });
});

describe('tokensToChunks', () => {
  it('maps kinds, finality and <end>', () => {
    const r = tokensToChunks([
      { text: 'Hello', is_final: true, language: 'en', translation_status: 'original' },
      { text: '<end>', is_final: true },
      { text: '안녕', is_final: false, language: 'ko', translation_status: 'translation' },
    ]);
    expect(r.final).toHaveLength(2);
    expect(r.final[1].endpoint).toBe(true);
    expect(r.interim[0].kind).toBe('translation');
  });
});
