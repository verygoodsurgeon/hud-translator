// 하단 컨트롤: 모드, 시작/정지, 언어 선택
import { useSettings } from '../settings/store';
import { LANGS } from '../settings/schema';
import { useSession, startSession, stopSession, setSpeaker } from '../session/session';
import type { Lang, Mode } from '../types';

const MODES: { id: Mode; label: string }[] = [
  { id: 'translate', label: '번역' },
  { id: 'conversation', label: '대화' },
  { id: 'transcribe', label: '받아쓰기' },
];

export function Controls() {
  const s = useSettings((st) => st.s);
  const set = useSettings((st) => st.set);
  const status = useSession((st) => st.status);
  const speaker = useSession((st) => st.speaker);
  const running = status === 'listening' || status === 'connecting';
  const busy = status === 'stopping';

  const toggle = () => (running ? void stopSession() : void startSession());
  const swap = () => {
    if (s.otherLang === 'auto') return;
    set({ myLang: s.otherLang, otherLang: s.myLang });
  };

  return (
    <div className="controls">
      <div className="seg" role="tablist">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={s.mode === m.id}
            className={s.mode === m.id ? 'on' : ''}
            disabled={running}
            onClick={() => set({ mode: m.id, otherLang: m.id === 'conversation' && s.otherLang === 'auto' ? 'en' : s.otherLang })}
          >
            {m.label}
          </button>
        ))}
      </div>

      {running && s.mode === 'conversation' && s.engine === 'webspeech' ? (
        <div className="seg">
          <button className={speaker === 'me' ? 'on' : ''} onClick={() => setSpeaker('me')}>내가 말함</button>
          <button className={speaker === 'other' ? 'on' : ''} onClick={() => setSpeaker('other')}>상대가 말함</button>
        </div>
      ) : null}

      <div className="langs">
        <label>
          <span>{s.mode === 'transcribe' ? '인식 언어' : '상대 언어'}</span>
          <select
            value={s.otherLang}
            disabled={running}
            onChange={(e) => set({ otherLang: e.target.value as Lang | 'auto' })}
            aria-label="상대 언어"
          >
            {s.mode !== 'conversation' ? <option value="auto">자동 감지</option> : null}
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </label>
        <button className="swap" onClick={swap} disabled={running || s.otherLang === 'auto'} aria-label="언어 맞바꾸기">⇄</button>
        <label>
          <span>내 언어</span>
          <select value={s.myLang} disabled={running} onChange={(e) => set({ myLang: e.target.value as Lang })} aria-label="내 언어">
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </label>
      </div>

      <button
        className={`rec${running ? ' running' : ''}`}
        onClick={toggle}
        disabled={busy}
        aria-label={running ? '정지' : '시작'}
        data-testid="rec"
      >
        {running ? '■' : '●'}
      </button>
    </div>
  );
}
