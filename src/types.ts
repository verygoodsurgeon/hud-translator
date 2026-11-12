// 핵심 타입. 바꾸면 docs/03_architecture.md §3도 갱신할 것.

export type Lang = 'ko' | 'zh' | 'ja' | 'en';
export type Mode = 'translate' | 'conversation' | 'transcribe';
export type EngineId = 'soniox' | 'webspeech' | 'mock';

/** 엔진이 내보내는 최소 단위. 원문/번역 모두 Chunk로 통일 */
export interface Chunk {
  kind: 'original' | 'translation';
  text: string;
  /** 엔진이 알려주면 채움 (예: Soniox token.language) */
  lang?: string;
  /** 화자 분리를 켰을 때 */
  speaker?: string;
  final: boolean;
  /** 이 Chunk 뒤에서 발화가 끝났음 (문장 경계 강제) */
  endpoint?: boolean;
}

/** final: 새로 확정된 조각(누적), interim: 아직 미확정(매번 통째로 교체) */
export interface EngineBatch {
  final: Chunk[];
  interim: Chunk[];
  receivedAt: number;
}

export type EngineStatus = 'idle' | 'connecting' | 'listening' | 'stopping' | 'error';

export interface GlossaryEntry {
  src: string;
  dst: string;
}

export type Translator = (text: string, from: string | undefined, to: Lang) => Promise<string>;

export interface EngineConfig {
  mode: Mode;
  myLang: Lang;
  otherLang: Lang | 'auto';
  diarization: boolean;
  glossary: GlossaryEntry[];
  sonioxApiKey?: string;
  /** 엔드포인트(발화 끝) 판정 최대 지연 ms (Soniox: 500–3000) */
  endpointDelayMs: number;
  /** webspeech 엔진에서 확정 문장 번역에 사용 */
  translator?: Translator;
}

export interface EngineCallbacks {
  onBatch(b: EngineBatch): void;
  onStatus(s: EngineStatus, message?: string): void;
  /** 지연 계측용: 발화 시작 감지 시각(performance.now()) */
  onSpeechStart?(t: number): void;
  /** 지연 계측용: 발화 끝 감지 시각 */
  onSpeechEnd?(t: number): void;
}

export interface Engine {
  start(cfg: EngineConfig, cb: EngineCallbacks): Promise<void>;
  /** 남은 결과를 마저 받고 종료 */
  stop(): Promise<void>;
  /** webspeech 대화 모드: 지금 말하는 사람 전환 */
  setSpeaker?(who: 'me' | 'other'): void;
}
