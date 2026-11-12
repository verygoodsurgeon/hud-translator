// 문장 분리. 한/중/일/영 문장부호 지원. 순수 함수.

export interface SentencePart {
  text: string;
  /** 문장부호로 끝났는가 */
  complete: boolean;
}

// 영문식 마침표류는 뒤에 공백/끝이 올 때만 경계 (소수점 80.5 보호). CJK 부호는 즉시 경계.
const BOUNDARY = /([.!?…]+["'”’)\]]*(?=\s|$)|[。！？]+["'”’」』)]*|\n+)/g;

export function splitSentences(text: string): SentencePart[] {
  const out: SentencePart[] = [];
  let last = 0;
  BOUNDARY.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BOUNDARY.exec(text))) {
    const end = m.index + m[0].length;
    const piece = text.slice(last, end);
    if (piece.trim()) out.push({ text: piece, complete: true });
    last = end;
  }
  const rest = text.slice(last);
  if (rest.trim()) out.push({ text: rest, complete: false });
  return out;
}
