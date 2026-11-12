// 기록 화면 (F9)
import { useState } from 'react';
import { deleteSession, loadHistory, toMarkdown, type SessionRecord } from '../session/history';

export function HistoryPanel({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<SessionRecord[]>(loadHistory);
  const [open, setOpen] = useState<SessionRecord | null>(null);

  const download = (r: SessionRecord) => {
    const blob = new Blob([toMarkdown(r)], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `대화기록-${new Date(r.startedAt).toISOString().slice(0, 16).replace(':', '')}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="panel" role="dialog" aria-label="기록">
      <header>
        <h2>{open ? '기록 보기' : '대화 기록'}</h2>
        <button onClick={() => (open ? setOpen(null) : onClose())} aria-label="닫기">✕</button>
      </header>
      {open ? (
        <div className="hist-detail">
          <div className="hist-actions">
            <button onClick={() => navigator.clipboard?.writeText(toMarkdown(open))}>복사</button>
            <button onClick={() => download(open)}>Markdown 저장</button>
            <button
              className="danger"
              onClick={() => {
                deleteSession(open.id);
                setItems(loadHistory());
                setOpen(null);
              }}
            >
              삭제
            </button>
          </div>
          <h3>원문</h3>
          <pre>{open.original || '(없음)'}</pre>
          <h3>번역</h3>
          <pre>{open.translation || '(없음)'}</pre>
          {open.refined ? (
            <>
              <h3>정밀 번역</h3>
              <pre>{open.refined}</pre>
            </>
          ) : null}
        </div>
      ) : items.length ? (
        <ul className="hist-list">
          {items.map((r) => (
            <li key={r.id}>
              <button onClick={() => setOpen(r)}>
                <b>{new Date(r.startedAt).toLocaleString('ko-KR')}</b>
                <small>
                  {r.mode} · {r.otherLang} → {r.myLang} · {Math.max(1, Math.round((r.endedAt - r.startedAt) / 60000))}분
                </small>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="note">저장된 기록이 없습니다.</p>
      )}
    </div>
  );
}
