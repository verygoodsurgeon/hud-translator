// 번역 프롬프트 (순수 함수)
import type { GlossaryEntry } from '../types';
import { langInfo } from '../settings/schema';

export interface ContextPair { src: string; dst: string }

export function buildSystemPrompt(from: string | undefined, to: string, glossary: GlossaryEntry[]): string {
  const f = from ? `${langInfo(from)?.native ?? from}` : '자동 감지된 언어';
  const t = langInfo(to)?.native ?? to;
  const lines = [
    `You are a professional simultaneous interpreter. Translate the user's utterance from ${f} into ${t}.`,
    'Output ONLY the translation, with no quotes, notes, or explanations.',
    'Keep the spoken, conversational register. Preserve numbers, units, drug names and medical terms precisely.',
    'The text comes from live speech recognition and may contain recognition errors; infer the intended meaning from context.',
  ];
  const g = glossary.filter((x) => x.src && x.dst);
  if (g.length) {
    lines.push('Always use these glossary translations:');
    for (const x of g) lines.push(`- ${x.src} => ${x.dst}`);
  }
  return lines.join('\n');
}

export function buildUserMessage(text: string, context: ContextPair[]): string {
  if (!context.length) return text;
  const ctx = context.map((c) => `${c.src}\n=> ${c.dst}`).join('\n');
  return `<previous_context>\n${ctx}\n</previous_context>\n\nTranslate this utterance:\n${text}`;
}
