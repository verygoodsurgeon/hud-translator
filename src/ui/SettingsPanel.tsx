// 설정 화면. 항목 = docs/02_requirements.md §3
import { useState, type ReactNode } from 'react';
import { useSettings } from '../settings/store';
import { REFINE_MODELS } from '../settings/schema';
import { ENGINES } from '../engines';
import { clearHistory } from '../session/history';
import type { EngineId } from '../types';

function Toggle({ label, checked, onChange, note, disabled, testId }: { label: string; checked: boolean; onChange: (v: boolean) => void; note?: string; disabled?: boolean; testId?: string }) {
  return (
    <label className={`row toggle${disabled ? ' disabled' : ''}`}>
      <span>
        {label}
        {note ? <small>{note}</small> : null}
      </span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} data-testid={testId} />
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { s, set, setHud, setRefine, reset } = useSettings();
  const [src, setSrc] = useState('');
  const [dst, setDst] = useState('');

  return (
    <div className="panel" role="dialog" aria-label="설정">
      <header>
        <h2>설정</h2>
        <button onClick={onClose} aria-label="닫기" data-testid="close-settings">✕</button>
      </header>

      <Section title="엔진">
        {ENGINES.map((e) => (
          <label key={e.id} className={`row${e.available() ? '' : ' disabled'}`}>
            <span>
              {e.label}
              <small>{e.available() ? e.note : '이 브라우저에서 지원하지 않음'}</small>
            </span>
            <input type="radio" name="engine" checked={s.engine === e.id} disabled={!e.available()} onChange={() => set({ engine: e.id as EngineId })} />
          </label>
        ))}
        <label className="row col">
          <span>Soniox API 키 <small>기기에만 저장됩니다</small></span>
          <input type="password" value={s.sonioxApiKey} onChange={(e) => set({ sonioxApiKey: e.target.value.trim() })} placeholder="soniox.com 콘솔에서 발급" autoComplete="off" />
        </label>
        <label className="row col">
          <span>발화 끝 판정 대기 {s.endpointDelayMs}ms <small>짧을수록 빨리 확정, 너무 짧으면 문장이 끊김</small></span>
          <input type="range" min={500} max={3000} step={100} value={s.endpointDelayMs} onChange={(e) => set({ endpointDelayMs: Number(e.target.value) })} />
        </label>
      </Section>

      <Section title="정확도">
        <label className="row col">
          <span>Claude API 키 <small>정밀 번역과 브라우저 내장 엔진의 번역에 사용. 기기에만 저장</small></span>
          <input type="password" value={s.refine.apiKey} onChange={(e) => setRefine({ apiKey: e.target.value.trim() })} placeholder="console.anthropic.com 에서 발급" autoComplete="off" />
        </label>
        <Toggle label="정밀 번역 (2단계)" note="문장이 끝나면 Claude가 문맥·용어집으로 다시 번역해 교체 (Soniox 엔진)" checked={s.refine.enabled} onChange={(v) => setRefine({ enabled: v })} testId="toggle-refine" />
        <label className="row">
          <span>번역 모델</span>
          <select value={s.refine.model} onChange={(e) => setRefine({ model: e.target.value })}>
            {REFINE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </label>
        <div className="row col">
          <span>용어집 <small>원문 → 번역. 인식·번역 모두에 반영</small></span>
          {s.glossary.map((g, i) => (
            <div key={i} className="gloss">
              <span>{g.src} → {g.dst}</span>
              <button onClick={() => set({ glossary: s.glossary.filter((_, j) => j !== i) })} aria-label="삭제">✕</button>
            </div>
          ))}
          <div className="gloss-add">
            <input value={src} onChange={(e) => setSrc(e.target.value)} placeholder="원문 (예: trauma bay)" />
            <input value={dst} onChange={(e) => setDst(e.target.value)} placeholder="번역 (예: 외상 처치실)" />
            <button
              onClick={() => {
                if (!src.trim() || !dst.trim()) return;
                set({ glossary: [...s.glossary, { src: src.trim(), dst: dst.trim() }] });
                setSrc('');
                setDst('');
              }}
            >
              추가
            </button>
          </div>
        </div>
      </Section>

      <Section title="표시 (HUD)">
        <Toggle label="원문 함께 보기" checked={s.showOriginal} onChange={(v) => set({ showOriginal: v })} testId="toggle-original" />
        <Toggle label="중간 결과 보기" note="확정 전 글자를 흐리게 바로 표시" checked={s.showInterim} onChange={(v) => set({ showInterim: v })} />
        <label className="row col">
          <span>글자 크기 {s.hud.fontSize}px</span>
          <input type="range" min={16} max={64} value={s.hud.fontSize} onChange={(e) => setHud({ fontSize: Number(e.target.value) })} data-testid="font-size" />
        </label>
        <label className="row col">
          <span>표시 줄 수 {s.hud.maxLines}</span>
          <input type="range" min={1} max={10} value={s.hud.maxLines} onChange={(e) => setHud({ maxLines: Number(e.target.value) })} />
        </label>
        <label className="row">
          <span>위치</span>
          <select value={s.hud.position} onChange={(e) => setHud({ position: e.target.value as 'top' | 'middle' | 'bottom' })}>
            <option value="top">위</option>
            <option value="middle">가운데</option>
            <option value="bottom">아래</option>
          </select>
        </label>
        <label className="row">
          <span>글자 색</span>
          <select value={s.hud.color} onChange={(e) => setHud({ color: e.target.value as 'green' | 'white' | 'amber' })}>
            <option value="green">녹색 (글라스 느낌)</option>
            <option value="white">흰색</option>
            <option value="amber">호박색</option>
          </select>
        </label>
        <Toggle label="좌우 반전" note="반사판(HUD 거치대)에 비출 때" checked={s.hud.mirror} onChange={(v) => setHud({ mirror: v })} />
      </Section>

      <Section title="기능 켜기/끄기">
        <Toggle label="화자 구분" note="Soniox 엔진에서 화자별 표시" checked={s.diarization} onChange={(v) => set({ diarization: v })} />
        <Toggle label="대화 기록 저장" note="이 기기에만 텍스트로 저장 (음성은 저장 안 함)" checked={s.history.enabled} onChange={(v) => set({ history: { enabled: v } })} />
        <Toggle label="지연 시간 표시" note="첫 글자·확정까지 걸린 시간(ms)" checked={s.latencyOverlay} onChange={(v) => set({ latencyOverlay: v })} testId="toggle-latency" />
        <Toggle label="화면 꺼짐 방지" checked={s.wakeLock} onChange={(v) => set({ wakeLock: v })} />
        <Toggle label="번역 음성 읽기 (준비 중)" checked={s.tts.enabled} onChange={() => {}} disabled />
        <Toggle label="대화 요약 (준비 중)" checked={s.summary.enabled} onChange={() => {}} disabled />
        <Toggle label="대화 보조·사전 자료 (준비 중)" checked={s.assist.enabled} onChange={() => {}} disabled />
        <Toggle label="텔레프롬프터 (준비 중)" checked={s.teleprompter.enabled} onChange={() => {}} disabled />
      </Section>

      <Section title="개인정보">
        <p className="note">
          Soniox·Claude 엔진을 쓰면 음성 또는 텍스트가 해당 회사 서버로 전송됩니다. 환자 정보가 포함된 대화에 사용하기 전에 기관 규정을 확인하세요.
          API 키와 기록은 이 기기의 브라우저 저장소에만 있습니다.
        </p>
        <button className="danger" onClick={() => confirm('모든 대화 기록을 지울까요?') && clearHistory()}>기록 전체 삭제</button>
        <button className="danger" onClick={() => confirm('설정을 초기화할까요? (키 포함)') && reset()}>설정 초기화</button>
      </Section>
    </div>
  );
}
