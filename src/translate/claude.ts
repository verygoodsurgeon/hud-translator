// Claude API로 문장 번역 (webspeech 엔진의 번역, F6 정밀번역 공용).
// 브라우저에서 직접 호출: 개인용. 키는 기기에만 저장된다.
import Anthropic from '@anthropic-ai/sdk';
import type { GlossaryEntry, Lang } from '../types';
import { buildSystemPrompt, buildUserMessage, type ContextPair } from './prompt';

let cached: { key: string; client: Anthropic } | null = null;
function client(apiKey: string): Anthropic {
  if (!cached || cached.key !== apiKey) {
    cached = { key: apiKey, client: new Anthropic({ apiKey, dangerouslyAllowBrowser: true }) };
  }
  return cached.client;
}

export interface TranslateOptions {
  apiKey: string;
  model: string;
  glossary: GlossaryEntry[];
  context?: ContextPair[];
  /** 토큰이 올 때마다 누적 텍스트 전달 (HUD에 바로 표시) */
  onPartial?: (text: string) => void;
  signal?: AbortSignal;
}

export async function translateWithClaude(
  text: string,
  from: string | undefined,
  to: Lang,
  opts: TranslateOptions,
): Promise<string> {
  const stream = client(opts.apiKey).messages.stream(
    {
      model: opts.model,
      max_tokens: 1024,
      output_config: { effort: 'low' },
      system: buildSystemPrompt(from, to, opts.glossary),
      messages: [{ role: 'user', content: buildUserMessage(text, opts.context ?? []) }],
    },
    { signal: opts.signal },
  );
  let acc = '';
  stream.on('text', (delta) => {
    acc += delta;
    opts.onPartial?.(acc);
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('번역이 거절되었습니다');
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}
