// 지연 계측 표시 (F14)
import { useSession } from '../session/session';
import type { Pct } from '../core/latency';

const fmt = (p: Pct) => (p.p50 === null ? '–' : `${p.p50}ms (p90 ${p.p90})`);

export function LatencyOverlay() {
  const st = useSession((s) => s.latency);
  if (!st) return <div className="latency" data-testid="latency">지연: 측정 대기</div>;
  return (
    <div className="latency" data-testid="latency">
      첫 원문 {fmt(st.firstOriginal)} · 첫 번역 {fmt(st.firstTranslation)} · 확정 {fmt(st.final)} · n={st.n}
    </div>
  );
}
