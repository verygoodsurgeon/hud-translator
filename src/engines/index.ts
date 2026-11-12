// 엔진 등록부. 새 엔진 = Engine 구현 + 여기 한 줄.
import type { Engine, EngineId } from '../types';
import { SonioxEngine } from './soniox';
import { WebSpeechEngine, isWebSpeechSupported } from './webspeech';
import { MockEngine } from './mock';

export const ENGINES: { id: EngineId; label: string; note: string; available: () => boolean }[] = [
  { id: 'soniox', label: 'Soniox 실시간 (권장)', note: '가장 빠름. 말하는 도중 번역. API 키 필요', available: () => true },
  { id: 'webspeech', label: '브라우저 내장 (무료)', note: '받아쓰기 무료. 번역은 Claude 키 필요. 문장 끝난 뒤 번역', available: isWebSpeechSupported },
  { id: 'mock', label: '데모 (가짜 대화)', note: '마이크 없이 화면 확인용', available: () => true },
];

export function createEngine(id: EngineId): Engine {
  switch (id) {
    case 'soniox':
      return new SonioxEngine();
    case 'webspeech':
      return new WebSpeechEngine();
    case 'mock':
      return new MockEngine();
  }
}
