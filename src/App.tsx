import { useState } from 'react';
import { useSettings } from './settings/store';
import { langInfo } from './settings/schema';
import { useSession } from './session/session';
import { Hud, ConversationHud } from './ui/Hud';
import { Controls } from './ui/Controls';
import { SettingsPanel } from './ui/SettingsPanel';
import { HistoryPanel } from './ui/HistoryPanel';
import { LatencyOverlay } from './ui/LatencyOverlay';

const STATUS_LABEL: Record<string, string> = {
  idle: '대기',
  connecting: '연결 중',
  listening: '듣는 중',
  stopping: '마무리 중',
  error: '오류',
};

export default function App() {
  const s = useSettings((st) => st.s);
  const set = useSettings((st) => st.set);
  const status = useSession((st) => st.status);
  const error = useSession((st) => st.error);
  const [panel, setPanel] = useState<'none' | 'settings' | 'history'>('none');
  const [immersive, setImmersive] = useState(false);

  const dir =
    s.mode === 'transcribe'
      ? `${s.otherLang === 'auto' ? '자동' : langInfo(s.otherLang)?.label} 받아쓰기`
      : s.mode === 'conversation'
        ? `${langInfo(s.myLang)?.label} ⇄ ${langInfo(s.otherLang)?.label}`
        : `${s.otherLang === 'auto' ? '자동' : langInfo(s.otherLang)?.label} → ${langInfo(s.myLang)?.label}`;

  return (
    <div className="app">
      {!immersive ? (
        <div className="topbar">
          <span className={`dot ${status}`} />
          <span data-testid="status">{STATUS_LABEL[status]}</span>
          <span className="dir">{dir}</span>
          <span className="spacer" />
          <button onClick={() => setPanel('history')} aria-label="기록">☰</button>
          <button onClick={() => setPanel('settings')} aria-label="설정" data-testid="open-settings">⚙</button>
        </div>
      ) : null}
      {error && status === 'error' ? <div className="error" role="alert">{error}</div> : null}

      <main className="stage" onClick={() => setImmersive((v) => !v)}>
        {s.mode === 'conversation' ? <ConversationHud /> : <Hud />}
      </main>

      {s.latencyOverlay ? <LatencyOverlay /> : null}
      {!immersive ? <Controls /> : null}

      {panel === 'settings' ? <SettingsPanel onClose={() => setPanel('none')} /> : null}
      {panel === 'history' ? <HistoryPanel onClose={() => setPanel('none')} /> : null}

      {!s.privacyAck ? (
        <div className="panel modal" role="dialog" aria-label="안내">
          <h2>처음 사용 안내</h2>
          <p>이 앱은 휴대폰 마이크로 들은 말을 화면에 자막으로 띄웁니다.</p>
          <p>
            Soniox 또는 Claude 엔진을 쓰면 <b>음성·텍스트가 해당 회사 서버로 전송</b>됩니다. 환자 정보가 담긴 대화에 쓰기 전에 기관 규정을
            확인하세요. 키와 기록은 이 기기에만 저장됩니다.
          </p>
          <p>키가 없으면 설정에서 "데모" 엔진으로 화면을 먼저 확인할 수 있습니다.</p>
          <button className="primary" onClick={() => set({ privacyAck: true })} data-testid="ack">확인</button>
        </div>
      ) : null}
    </div>
  );
}
