// 세션 오케스트레이션: 엔진 시작/정지, 자막 상태, 지연 계측, 정밀번역(F6), 기록(F9), 화면 꺼짐 방지(F15).
import { create } from 'zustand';
import type { Chunk, Engine, EngineConfig, EngineStatus, Lang } from '../types';
import { applyBatch, emptyTranscript, finalSentences, toPlainText, type TranscriptState } from '../core/transcript';
import { LatencyTracker, type LatencyStats } from '../core/latency';
import { createEngine } from '../engines';
import { translateWithClaude } from '../translate/claude';
import { useSettings } from '../settings/store';
import type { Settings } from '../settings/schema';
import { saveSession } from './history';

export interface Refined {
  text: string;
  done: boolean;
  error?: boolean;
}

interface SessionStore {
  status: EngineStatus;
  error: string | null;
  transcript: TranscriptState;
  refined: Record<string, Refined>;
  latency: LatencyStats | null;
  speaker: 'me' | 'other';
  startedAt: number | null;
}

export const useSession = create<SessionStore>(() => ({
  status: 'idle',
  error: null,
  transcript: emptyTranscript(),
  refined: {},
  latency: null,
  speaker: 'other',
  startedAt: null,
}));

let engine: Engine | null = null;
let tracker = new LatencyTracker();
let wakeLock: { release(): Promise<void> } | null = null;
let refineInFlight = 0;
const refineQueue: string[] = [];
let lastSettings: Settings | null = null;

/** 문장의 번역 목표 언어 */
export function targetFor(s: Settings, lang: string | undefined): Lang {
  if (s.mode === 'conversation' && s.otherLang !== 'auto') return lang === s.myLang ? s.otherLang : s.myLang;
  return s.myLang;
}

/** 번역 대상 원문인가 (내 언어로 말한 원문은 한 방향 번역에서 제외) */
export function needsTranslation(s: Settings, c: Chunk): boolean {
  if (s.mode === 'transcribe') return false;
  if (s.mode === 'conversation') return true;
  return c.lang !== s.myLang;
}

function buildConfig(s: Settings): EngineConfig {
  const cfg: EngineConfig = {
    mode: s.mode,
    myLang: s.myLang,
    otherLang: s.otherLang,
    diarization: s.diarization,
    glossary: s.glossary,
    sonioxApiKey: s.sonioxApiKey,
    endpointDelayMs: s.endpointDelayMs,
  };
  if (s.refine.apiKey) {
    cfg.translator = (text, from, to) =>
      translateWithClaude(text, from, to, { apiKey: s.refine.apiKey, model: s.refine.model, glossary: s.glossary });
  }
  return cfg;
}

export async function startSession(): Promise<void> {
  const s = useSettings.getState().s;
  lastSettings = s;
  if (engine) await stopSession();
  tracker = new LatencyTracker();
  refineQueue.length = 0;
  useSession.setState({ transcript: emptyTranscript(), refined: {}, error: null, latency: null, startedAt: Date.now(), speaker: 'other' });
  engine = createEngine(s.engine);
  if (s.wakeLock) void requestWakeLock();
  try {
    await engine.start(buildConfig(s), {
      onBatch: (b) => {
        tracker.onBatch(b);
        if (!b.interim.length && b.final.some((c) => c.kind === 'translation')) tracker.lateTranslation(b.receivedAt);
        const transcript = applyBatch(useSession.getState().transcript, b);
        useSession.setState({ transcript, latency: tracker.stats() });
        if (refineActive(s) && b.final.length) scheduleRefine(s);
      },
      onStatus: (status, message) =>
        useSession.setState(status === 'error' ? { status, error: message ?? '오류' } : { status }),
      onSpeechStart: (t) => tracker.speechStart(t),
      onSpeechEnd: (t) => tracker.speechEnd(t),
    });
  } catch (err) {
    useSession.setState({ status: 'error', error: (err as Error).message });
    engine = null;
    releaseWakeLock();
  }
}

export async function stopSession(): Promise<void> {
  const e = engine;
  engine = null;
  if (e) await e.stop();
  releaseWakeLock();
  useSession.setState((st) => ({ status: st.status === 'error' ? 'error' : 'idle' }));
  const s = lastSettings ?? useSettings.getState().s;
  const st = useSession.getState();
  if (s.history.enabled && st.transcript.finals.length) {
    const plain = toPlainText(st.transcript);
    const refined = Object.values(st.refined).filter((r) => r.done).map((r) => r.text).join('\n');
    saveSession({
      id: String(st.startedAt ?? Date.now()),
      startedAt: st.startedAt ?? Date.now(),
      endedAt: Date.now(),
      mode: s.mode,
      myLang: s.myLang,
      otherLang: s.otherLang,
      original: plain.original,
      translation: plain.translation,
      refined: refined || undefined,
    });
  }
}

export function setSpeaker(who: 'me' | 'other') {
  useSession.setState({ speaker: who });
  engine?.setSpeaker?.(who);
}

// ---- 정밀 번역 (F6) ----
/** 브라우저 내장 엔진은 이미 Claude로 문장 번역을 하므로 정밀번역을 중복하지 않는다 */
export const refineActive = (s: Settings) =>
  s.refine.enabled && !!s.refine.apiKey && s.mode !== 'transcribe' && s.engine !== 'webspeech';

function scheduleRefine(s: Settings) {
  const st = useSession.getState();
  const sentences = finalSentences(st.transcript, (c) => needsTranslation(s, c));
  for (const sen of sentences) {
    if (!st.refined[sen.id] && !refineQueue.includes(sen.id)) refineQueue.push(sen.id);
  }
  pumpRefine(s);
}

function pumpRefine(s: Settings) {
  while (refineInFlight < 2 && refineQueue.length) {
    const id = refineQueue.shift()!;
    const st = useSession.getState();
    const all = finalSentences(st.transcript, (c) => needsTranslation(s, c));
    const idx = all.findIndex((x) => x.id === id);
    if (idx < 0) continue;
    const sen = all[idx];
    const context = all
      .slice(Math.max(0, idx - 3), idx)
      .map((p) => ({ src: p.text, dst: st.refined[p.id]?.text ?? '' }))
      .filter((p) => p.dst);
    refineInFlight++;
    setRefined(id, { text: '', done: false });
    translateWithClaude(sen.text, sen.lang, targetFor(s, sen.lang), {
      apiKey: s.refine.apiKey,
      model: s.refine.model,
      glossary: s.glossary,
      context,
      onPartial: (text) => setRefined(id, { text, done: false }),
    })
      .then((text) => setRefined(id, { text, done: true }))
      .catch(() => setRefined(id, { text: '', done: true, error: true }))
      .finally(() => {
        refineInFlight--;
        pumpRefine(s);
      });
  }
}

function setRefined(id: string, r: Refined) {
  useSession.setState((st) => ({ refined: { ...st.refined, [id]: r } }));
}

// ---- 화면 꺼짐 방지 (F15) ----
async function requestWakeLock() {
  try {
    const nav = navigator as unknown as { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } };
    wakeLock = (await nav.wakeLock?.request('screen')) ?? null;
  } catch {
    wakeLock = null;
  }
}
function releaseWakeLock() {
  void wakeLock?.release().catch(() => {});
  wakeLock = null;
}
