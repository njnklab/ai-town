import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useMemo, useState, useEffect } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

function useWorldId() {
  const ws = useQuery(api.world.defaultWorldStatus);
  return ws?.worldId as any;
}

function dayStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function Dashboard() {
  const worldId = useWorldId();
  const [windowDays, setWindowDays] = useState(7);
  const [metric, setMetric] = useState<'stress' | 'anxiety' | 'joy'>('stress');
  const [scope, setScope] = useState<'class' | string>('class');
  const descriptions = useQuery(api.world.gameDescriptions, worldId ? { worldId } : 'skip');
  const worldState = useQuery(api.world.worldState, worldId ? { worldId } : 'skip');
  const to = dayStr(new Date());
  const from = dayStr(new Date(Date.now() - (windowDays - 1) * 24 * 3600 * 1000));

  const trends = useQuery(scope === 'class' ? api.dashboard.classTrends : api.dashboard.agentTrends, worldId ? (scope === 'class' ? { worldId, from, to } : { worldId, agentId: scope, from, to }) : 'skip');
  const dist = useQuery(api.dashboard.distributionLatest, worldId ? { worldId } : 'skip');
  const topN = useQuery(api.dashboard.topNPeers, worldId ? { worldId, metric, n: 5 } : 'skip');
  const eventDays = useQuery(api.dashboard.eventsRangeDays, worldId ? { worldId, from, to } : 'skip');
  const examDays = useQuery(api.dashboard.examsRangeDays, worldId ? { worldId, from, to } : 'skip');
  const currentStates = useQuery(api.psych.currentStates, worldId ? { worldId } : 'skip');
  const recentEvents = useQuery(api.psych.eventsSince, worldId ? { worldId, since: Date.now() - 48 * 3600 * 1000 } : 'skip');

  const t = useMemo(() => (trends ?? []).map((r) => r.day), [trends]);
  const stress = useMemo(() => (trends ?? []).map((r) => r.stressAvg), [trends]);
  const anxiety = useMemo(() => (trends ?? []).map((r) => r.anxietyAvg), [trends]);
  const joy = useMemo(() => (trends ?? []).map((r) => r.joyAvg), [trends]);
  const distValues = useMemo(() => (dist ?? []).map((r: any) => r.stressAvg as number), [dist]);
  const summary = useMemo(() => {
    if (!currentStates || currentStates.length === 0) return null;
    const avg = (key: 'stress' | 'energy' | 'risk') =>
      currentStates.reduce((acc: number, cur: any) => acc + (cur[key] ?? 0), 0) / currentStates.length;
    const worst = [...currentStates].sort((a: any, b: any) => (b.stress ?? 0) - (a.stress ?? 0)).slice(0, 3);
    return {
      avgStress: avg('stress'),
      avgEnergy: avg('energy'),
      avgRisk: avg('risk'),
      worst,
    };
  }, [currentStates]);

  return (
    <div className="p-4 text-white min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">班级仪表盘</h1>
        <a className="underline" href="/ai-town">返回小镇</a>
      </div>
      <div className="mt-2 flex gap-4 items-center">
        <label>
          维度：
          <select className="text-black ml-1" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="class">全班</option>
            {(() => {
              const nameByPlayer = new Map<string, string>();
              for (const pd of (descriptions?.playerDescriptions ?? []) as any[]) {
                nameByPlayer.set(pd.playerId, pd.name);
              }
              const agents = (worldState?.world.agents ?? []) as any[];
              return agents.map((ag) => (
                <option key={ag.id} value={ag.id}>{nameByPlayer.get(ag.playerId) ?? ag.id}</option>
              ));
            })()}
          </select>
        </label>
        <label>
          窗口：
          <select className="text-black ml-1" value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value))}>
            <option value={7}>7 天</option>
            <option value={30}>30 天</option>
          </select>
        </label>
        <label>
          Top-N 指标：
          <select className="text-black ml-1" value={metric} onChange={(e) => setMetric(e.target.value as any)}>
            <option value="stress">stress</option>
            <option value="anxiety">anxiety</option>
            <option value="joy">joy</option>
          </select>
        </label>
      </div>

      <section className="mt-6 grid md:grid-cols-3 gap-4">
        <SummaryCard title="平均压力" value={summary ? summary.avgStress : null} format={(x) => `${(x * 100).toFixed(1)}%`} />
        <SummaryCard title="平均能量" value={summary ? summary.avgEnergy : null} format={(x) => `${(x * 100).toFixed(1)}%`} />
        <SummaryCard title="平均风险" value={summary ? summary.avgRisk : null} format={(x) => `${(x * 100).toFixed(1)}%`} />
      </section>

      {summary && summary.worst.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xl mb-2">压力最高的 3 位同学</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {summary.worst.map((s: any) => (
              <div key={s.agentId} className="rounded bg-slate-800/80 border border-slate-700 p-3 text-sm space-y-1">
                <div className="font-semibold">{s.name}</div>
                <div>压力：{(s.stress * 100).toFixed(1)}%</div>
                <div>风险：{(s.risk * 100).toFixed(1)}%</div>
                <div className="text-xs text-slate-300">{s.status ?? '状态稳定'}</div>
                {s.lastEvent && <div className="text-xs text-amber-300">{s.lastEvent}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-4">
        <h2 className="text-xl">全班趋势（{from} ~ {to}）</h2>
        <SimpleMultiLine
          labels={['stress', 'anxiety', 'joy']}
          series={[stress, anxiety, joy]}
          t={t.map((x, i) => i)}
          xLabels={t}
          vlines={[
            ...((eventDays as any[] | undefined)?.map((e) => ({ day: e.day, color: '#f59e0b' })) ?? []),
            ...((examDays as any[] | undefined)?.map((e) => ({ day: e.day, color: '#22c55e' })) ?? []),
          ]}
          events={(eventDays as any[] | undefined) ?? []}
          exams={(examDays as any[] | undefined) ?? []}
        />
      </section>

      {scope === 'class' && (
      <section className="mt-6">
        <h2 className="text-xl">分布视图（最新日，按 stressAvg）</h2>
        <Histogram values={distValues} bins={20} />
      </section>
      )}

      <section className="mt-6">
        <h2 className="text-xl">Top {topN ? (topN as any[]).length : 0} 变化（{metric} 改善）</h2>
        {scope === 'class' ? (
          <ul className="list-disc ml-6">
            {(topN as any[] | undefined)?.map((r) => (
              <li key={r.agentId}>
                {r.agentId}: Δ={r.delta.toFixed(3)}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-300">单人视图下不显示全班 Top-N。</div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-xl">最近 48 小时事件</h2>
        <EventList events={recentEvents ?? []} />
      </section>
    </div>
  );
}

function SummaryCard({ title, value, format }: { title: string; value: number | null; format: (x: number) => string }) {
  return (
    <div className="rounded bg-slate-800/80 border border-slate-700 p-3">
      <div className="text-sm text-slate-300">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value == null ? '--' : format(value)}</div>
    </div>
  );
}

function SimpleMultiLine({ t, series, labels, xLabels, vlines, events, exams }: { t: number[]; series: number[][]; labels: string[]; xLabels?: string[]; vlines?: { day: string; color: string }[]; events?: any[]; exams?: any[] }) {
  const ref = useState<HTMLDivElement | null>(null)[0];
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [plot, setPlot] = useState<uPlot | null>(null);
  const data = useMemo(() => [t, ...series] as uPlot.AlignedData, [t, series]);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  useEffectOnce(() => {
    if (!el) return;
    const p = new uPlot({
      width: 900,
      height: 260,
      series: [{}, ...labels.map((l) => ({ label: l }))],
      axes: [
        {
          values: (u, splits) => (xLabels ? splits.map((i) => (xLabels[i] ?? '').slice(5)) : splits.map(String)),
        },
        {},
      ],
      hooks: {
        draw: [
          (u) => {
            if (!vlines || !xLabels) return;
            const ctx = u.ctx;
            const toIdx = (day: string) => xLabels.findIndex((d) => d === day);
            vlines.forEach((vl) => {
              const idx = toIdx(vl.day);
              if (idx < 0) return;
              const x = Math.round(u.valToPos(idx, 'x', true));
              ctx.save();
              ctx.strokeStyle = vl.color;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(x, u.bbox.top);
              ctx.lineTo(x, u.bbox.top + u.bbox.height);
              ctx.stroke();
              ctx.restore();
            });
          },
        ],
      },
    }, data, el);
    setPlot(p);
  }, [el]);
  useEffectOnce(() => {
    if (!plot) return;
    plot.setData(data);
  }, [plot, data]);
  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!plot || !xLabels) return;
    const rect = (e.target as HTMLElement).closest('.uplot')?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const idx = Math.round(plot.posToIdx(px));
    const day = xLabels[idx];
    if (!day) { setTip(null); return; }
    const es = (events ?? []).filter((x: any) => x.day === day).map((x: any) => x.type);
    const xs = (exams ?? []).filter((x: any) => x.day === day).map((x: any) => x.name);
    if (es.length === 0 && xs.length === 0) { setTip(null); return; }
    setTip({ x: e.clientX, y: rect.top + 10, text: `${day}\n事件: ${es.join(', ') || '-'}\n考试: ${xs.join(', ') || '-'}` });
  }
  return (
    <div onMouseMove={onMove}>
      <div ref={setEl} />
      {tip && (
        <div style={{ position: 'fixed', left: tip.x + 10, top: tip.y, pointerEvents: 'none' }} className="bg-black/70 text-white text-xs px-2 py-1 rounded whitespace-pre">
          {tip.text}
        </div>
      )}
    </div>
  );
}

function Histogram({ values, bins = 10 }: { values: number[]; bins?: number }) {
  const min = 0, max = 1;
  const bucket = new Array(bins).fill(0);
  values.forEach((v) => {
    const idx = Math.max(0, Math.min(bins - 1, Math.floor(((v - min) / (max - min)) * bins)));
    bucket[idx]++;
  });
  return (
    <div className="flex gap-1 items-end h-32">
      {bucket.map((b, i) => (
        <div key={i} className="flex-1 bg-indigo-400/70" style={{ height: `${Math.min(b * 10, 120)}px` }} />
      ))}
    </div>
  );
}

function ExportCsv() { return null; }

function useEffectOnce(fn: () => void, deps: any[] = []) {
  useEffect(fn, deps);
}

function EventList({ events }: { events: any[] }) {
  if (!events.length) return <div className="text-sm text-slate-300">暂无事件</div>;
  const sorted = [...events].sort((a, b) => (b.time ?? 0) - (a.time ?? 0)).slice(0, 12);
  return (
    <div className="space-y-2 text-sm">
      {sorted.map((e, idx) => (
        <div key={idx} className="rounded border border-slate-700 bg-slate-800/70 p-3 flex items-start gap-3">
          <div className="text-xs text-slate-400 w-32 shrink-0">{new Date(e.time ?? e.start ?? 0).toLocaleString()}</div>
          <div>
            <div className="font-semibold">{e.type}</div>
            <div className="text-xs text-slate-300">目标：{e.target === 'class' ? '全班' : e.agentId ?? '-'}</div>
            <div className="text-xs text-amber-300">强度：{(e.intensity ?? 0).toFixed(2)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
