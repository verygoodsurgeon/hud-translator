// 설정의 단일 진실 원천. docs/02_requirements.md §3 표와 일치시킬 것.
import type { EngineId, GlossaryEntry, Lang, Mode } from '../types';

export interface LangInfo {
  code: Lang;
  label: string; // UI 표기 (한국어)
  native: string;
  bcp47: string; // Web Speech용
}

/** 언어 추가 = 이 배열에 한 줄 추가 + types.ts Lang 유니온에 코드 추가 */
export const LANGS: LangInfo[] = [
  { code: 'ko', label: '한국어', native: '한국어', bcp47: 'ko-KR' },
  { code: 'en', label: '영어', native: 'English', bcp47: 'en-US' },
  { code: 'ja', label: '일본어', native: '日本語', bcp47: 'ja-JP' },
  { code: 'zh', label: '중국어(보통화)', native: '中文', bcp47: 'zh-CN' },
];

export const langInfo = (code: string | undefined): LangInfo | undefined =>
  LANGS.find((l) => l.code === code);

export const REFINE_MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (정확)' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (빠름·저렴)' },
] as const;

export interface HudSettings {
  fontSize: number; // 16–64
  maxLines: number; // 1–10
  position: 'top' | 'middle' | 'bottom';
  color: 'green' | 'white' | 'amber';
  mirror: boolean;
}

export interface Settings {
  mode: Mode;
  myLang: Lang;
  otherLang: Lang | 'auto';
  engine: EngineId;
  sonioxApiKey: string;
  endpointDelayMs: number;
  showOriginal: boolean;
  showInterim: boolean;
  refine: { enabled: boolean; model: string; apiKey: string };
  diarization: boolean;
  glossary: GlossaryEntry[];
  history: { enabled: boolean };
  hud: HudSettings;
  latencyOverlay: boolean;
  wakeLock: boolean;
  // v2 (아직 미구현: UI에서 "준비 중"으로 비활성)
  tts: { enabled: boolean };
  summary: { enabled: boolean };
  assist: { enabled: boolean };
  teleprompter: { enabled: boolean };
  /** 첫 실행 개인정보 고지 확인 여부 */
  privacyAck: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'translate',
  myLang: 'ko',
  otherLang: 'en',
  engine: 'webspeech',
  sonioxApiKey: '',
  endpointDelayMs: 1000,
  showOriginal: true,
  showInterim: true,
  refine: { enabled: false, model: 'claude-opus-5-5', apiKey: '' },
  diarization: false,
  glossary: [],
  history: { enabled: true },
  hud: { fontSize: 28, maxLines: 4, position: 'middle', color: 'green', mirror: false },
  latencyOverlay: false,
  wakeLock: true,
  tts: { enabled: false },
  summary: { enabled: false },
  assist: { enabled: false },
  teleprompter: { enabled: false },
  privacyAck: false,
};

export const HUD_COLORS: Record<HudSettings['color'], string> = {
  green: '#39ff7a',
  white: '#f2f2f2',
  amber: '#ffbf3c',
};
