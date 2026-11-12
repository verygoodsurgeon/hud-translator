// 기록(F9): 기기 localStorage에만 저장. 오디오는 저장하지 않는다.
export interface SessionRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  mode: string;
  myLang: string;
  otherLang: string;
  original: string;
  translation: string;
  refined?: string;
}

const KEY = 'hudtr.history.v1';
const MAX = 50;

export function loadHistory(): SessionRecord[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as SessionRecord[];
  } catch {
    return [];
  }
}

export function saveSession(r: SessionRecord) {
  try {
    const all = [r, ...loadHistory().filter((x) => x.id !== r.id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* 저장 실패(사생활 모드 등)는 무시 */
  }
}

export function deleteSession(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadHistory().filter((x) => x.id !== id)));
  } catch {
    /* ignore */
  }
}

export function clearHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function toMarkdown(r: SessionRecord): string {
  const d = new Date(r.startedAt).toLocaleString('ko-KR');
  return [
    `# 대화 기록 ${d}`,
    `- 모드: ${r.mode} · 언어: ${r.otherLang} ↔ ${r.myLang}`,
    '',
    '## 원문',
    r.original || '(없음)',
    '',
    '## 번역',
    r.translation || '(없음)',
    ...(r.refined ? ['', '## 정밀 번역', r.refined] : []),
  ].join('\n');
}
