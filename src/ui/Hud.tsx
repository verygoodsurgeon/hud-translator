// 글라스 HUD 흉내 자막 영역 (F1/F3/F4/F5/F6/F7)
import { useMemo } from 'react';
import { useSettings } from '../settings/store';
import { HUD_COLORS } from '../settings/schema';
import { useSession, refineActive, needsTranslation } from '../session/session';
import { finalSentences, selectLines, type ChunkFilter, type Line } from '../core/transcript';
import type { Chunk } from '../types';

const SPEAKER_OPACITY = [1, 0.75, 0.9, 0.65];

function Lines({ lines, size, dim, showInterim, diar }: { lines: Line[]; size: number; dim?: boolean; showInterim: boolean; diar: boolean }) {
  return (
    <>
      {lines
        .filter((l) => showInterim || !l.interim)
        .map((l) => (
          <div
            key={l.key}
            className={`hud-line${l.interim ? ' interim' : ''}${dim ? ' dim' : ''}`}
            style={{ fontSize: size, opacity: diar && l.speaker ? SPEAKER_OPACITY[(Number(l.speaker) - 1) % 4] : undefined }}
          >
            {diar && l.speaker ? <span className="spk">{`화자${l.speaker} `}</span> : null}
            {l.text}
          </div>
        ))}
    </>
  );
}

/** 한 방향 번역 / 받아쓰기 HUD */
export function Hud() {
  const s = useSettings((st) => st.s);
  const transcript = useSession((st) => st.transcript);
  const refined = useSession((st) => st.refined);
  const { hud } = s;
  const color = HUD_COLORS[hud.color];
  const isOrig: ChunkFilter = (c: Chunk) => c.kind === 'original';
  const isTrans: ChunkFilter = (c: Chunk) => c.kind === 'translation';

  const content = useMemo(() => {
    if (s.mode === 'transcribe') {
      return { orig: selectLines(transcript, isOrig, hud.maxLines), trans: [] as Line[], pairs: null };
    }
    if (refineActive(s)) {
      const sentences = finalSentences(transcript, (c) => needsTranslation(s, c)).slice(-hud.maxLines);
      const pairs = sentences.map((x) => ({ ...x, refined: refined[x.id] }));
      // 확정 전 꼬리: 미확정 원문 + 스트리밍 번역 미확정분
      const tailOrig = transcript.interim.filter(isOrig).map((c) => c.text).join('');
      const tailTrans = transcript.interim.filter(isTrans).map((c) => c.text).join('');
      return { orig: [], trans: [], pairs, tailOrig, tailTrans };
    }
    return {
      orig: s.showOriginal ? selectLines(transcript, isOrig, hud.maxLines) : [],
      trans: selectLines(transcript, isTrans, hud.maxLines),
      pairs: null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, refined, s]);

  const small = Math.round(hud.fontSize * 0.62);
  const empty = !content.orig.length && !content.trans.length && !(content.pairs && content.pairs.length) && !content.tailOrig && !content.tailTrans;

  return (
    <div
      className={`hud hud-${hud.position}`}
      style={{ color, transform: hud.mirror ? 'scaleX(-1)' : undefined }}
      data-testid="hud"
    >
      {empty ? <div className="hud-hint" style={{ fontSize: small }}>시작 버튼을 누르고 말해 보세요</div> : null}
      {s.mode === 'transcribe' ? (
        <Lines lines={content.orig} size={hud.fontSize} showInterim={s.showInterim} diar={s.diarization} />
      ) : content.pairs ? (
        <>
          {content.pairs.map((p) => (
            <div key={p.id} className="hud-pair">
              {s.showOriginal ? <div className="hud-line dim" style={{ fontSize: small }}>{p.text}</div> : null}
              <div className={`hud-line${p.refined?.done ? '' : ' interim'}`} style={{ fontSize: hud.fontSize }}>
                {p.refined?.text || (p.refined?.error ? '(정밀 번역 실패)' : '…')}
              </div>
            </div>
          ))}
          {s.showInterim && (content.tailOrig || content.tailTrans) ? (
            <div className="hud-pair">
              {s.showOriginal && content.tailOrig ? <div className="hud-line dim interim" style={{ fontSize: small }}>{content.tailOrig}</div> : null}
              {content.tailTrans ? <div className="hud-line interim" style={{ fontSize: hud.fontSize }}>{content.tailTrans}</div> : null}
            </div>
          ) : null}
        </>
      ) : (
        <>
          {content.orig.length ? (
            <div className="hud-orig" data-testid="hud-orig">
              <Lines lines={content.orig} size={small} dim showInterim={s.showInterim} diar={s.diarization} />
            </div>
          ) : null}
          <div className="hud-trans" data-testid="hud-trans">
            <Lines lines={content.trans} size={hud.fontSize} showInterim={s.showInterim} diar={s.diarization} />
          </div>
        </>
      )}
    </div>
  );
}

/** 대화 모드(F2): 위쪽은 상대방용으로 180° 회전 */
export function ConversationHud() {
  const s = useSettings((st) => st.s);
  const transcript = useSession((st) => st.transcript);
  const { hud } = s;
  const color = HUD_COLORS[hud.color];
  const other = s.otherLang;
  const forOther = selectLines(transcript, (c) => c.kind === 'translation' && c.lang === other, hud.maxLines);
  const forMe = selectLines(transcript, (c) => c.kind === 'translation' && c.lang === s.myLang, hud.maxLines);
  const mirror = hud.mirror ? ' scaleX(-1)' : '';
  return (
    <div className="conv" style={{ color }} data-testid="conv">
      <div className="conv-half conv-top" style={{ transform: `rotate(180deg)${mirror}` }}>
        <Lines lines={forOther} size={hud.fontSize} showInterim={s.showInterim} diar={false} />
      </div>
      <div className="conv-divider" />
      <div className="conv-half" style={{ transform: mirror || undefined }}>
        <Lines lines={forMe} size={hud.fontSize} showInterim={s.showInterim} diar={false} />
      </div>
    </div>
  );
}
