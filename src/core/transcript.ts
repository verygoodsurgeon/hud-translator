// 자막 상태 관리 (순수 함수). React/브라우저 API 의존 금지.
import type { Chunk, EngineBatch } from '../types';
import { splitSentences } from './sentences';

export interface StoredChunk extends Chunk {
  id: number;
  /** 확정 수신 시각 (performance.now 기준 ms) */
  at: number;
}

export interface TranscriptState {
  finals: StoredChunk[];
  interim: Chunk[];
  nextId: number;
}

export const emptyTranscript = (): TranscriptState => ({ finals: [], interim: [], nextId: 1 });

const sameStream = (a: Chunk, b: Chunk) =>
  a.kind === b.kind && a.lang === b.lang && a.speaker === b.speaker;

/** 엔진 묶음을 상태에 반영. final은 누적(인접 동일 스트림은 병합), interim은 교체 */
export function applyBatch(st: TranscriptState, b: EngineBatch): TranscriptState {
  const finals = st.finals.slice();
  let nextId = st.nextId;
  for (const c of b.final) {
    if (!c.text) {
      // 텍스트 없는 endpoint 표시: 같은 kind의 마지막 조각을 닫는다
      if (c.endpoint) {
        for (let i = finals.length - 1; i >= 0; i--) {
          if (finals[i].kind === c.kind) {
            finals[i] = { ...finals[i], endpoint: true };
            break;
          }
        }
      }
      continue;
    }
    const last = finals[finals.length - 1];
    if (last && !last.endpoint && sameStream(last, c)) {
      finals[finals.length - 1] = {
        ...last,
        text: last.text + c.text,
        endpoint: c.endpoint || undefined,
        at: b.receivedAt,
      };
    } else {
      finals.push({ ...c, final: true, id: nextId++, at: b.receivedAt });
    }
  }
  return { finals, interim: b.interim.filter((c) => c.text), nextId };
}

export interface Line {
  key: string;
  text: string;
  interim: boolean;
  speaker?: string;
  lang?: string;
}

export type ChunkFilter = (c: Chunk) => boolean;

/** 필터에 맞는 조각을 문장 단위 줄로 만들고, 끝에 미확정 텍스트를 붙인다. 최근 maxLines줄 반환 */
export function selectLines(
  st: TranscriptState,
  filter: ChunkFilter,
  maxLines: number,
  includeInterim = true,
): Line[] {
  const lines: Line[] = [];
  let open: Line | null = null; // 아직 문장이 안 끝난 마지막 줄
  for (const c of st.finals) {
    if (!filter(c)) continue;
    const parts = splitSentences(c.text);
    parts.forEach((p, i) => {
      const text = p.text.trim();
      if (!text) return;
      if (open && open.speaker === c.speaker && i === 0) {
        open.text = joinText(open.text, text);
      } else {
        open = { key: `${c.id}:${i}`, text, interim: false, speaker: c.speaker, lang: c.lang };
        lines.push(open);
      }
      if (p.complete) open = null;
    });
    if (c.endpoint) open = null;
  }
  if (includeInterim) {
    const tail = st.interim.filter(filter).map((c) => c.text).join('').trim();
    if (tail) {
      if (open) {
        lines[lines.length - 1] = { ...(open as Line), text: joinText((open as Line).text, tail), interim: true };
      } else {
        lines.push({ key: 'interim', text: tail, interim: true });
      }
    }
  }
  return lines.slice(-maxLines);
}

/** CJK는 공백 없이, 그 외는 필요하면 공백을 넣어 잇는다 */
export function joinText(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  const cjk = /[぀-ヿ㐀-鿿가-힯]$/;
  if (/\s$/.test(a) || /^\s/.test(b) || /^[,.!?。、！？]/.test(b)) return a + b;
  if (cjk.test(a) && /^[぀-ヿ㐀-鿿]/.test(b)) return a + b;
  return `${a} ${b}`;
}

export interface FinalSentence {
  id: string;
  text: string;
  lang?: string;
  speaker?: string;
}

/** 확정된(문장부호나 endpoint로 끝난) 원문 문장 목록. 정밀번역(F6) 입력. id는 입력이 같으면 항상 같다 */
export function finalSentences(st: TranscriptState, filter: ChunkFilter): FinalSentence[] {
  const out: FinalSentence[] = [];
  for (const c of st.finals) {
    if (c.kind !== 'original' || !filter(c)) continue;
    const parts = splitSentences(c.text);
    parts.forEach((p, i) => {
      const isLast = i === parts.length - 1;
      const text = p.text.trim();
      if (text && (p.complete || (isLast && c.endpoint))) {
        out.push({ id: `${c.id}:${i}`, text, lang: c.lang, speaker: c.speaker });
      }
    });
  }
  return out;
}

/** 기록(F9)용 평문 */
export function toPlainText(st: TranscriptState): { original: string; translation: string } {
  const pick = (k: Chunk['kind']) =>
    st.finals
      .filter((c) => c.kind === k)
      .map((c) => (c.speaker ? `[${c.speaker}] ` : '') + c.text.trim())
      .join('\n');
  return { original: pick('original'), translation: pick('translation') };
}
