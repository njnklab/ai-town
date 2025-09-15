import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useMemo, useState, useEffect } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

function useWorldId() {
  const ws = useQuery(api.world.defaultWorldStatus);
  return ws?.worldId as any;
}

export default function Dashboard() {
  const worldId = useWorldId();
  const now = Date.now();
  const start = 0; // 以模拟小时为时间轴
  const end = 24 * 14; // 14天
  const snapshots = useQuery(api.psych.snapshotsRange, worldId ? { worldId, start, end } : 'skip');
  const events = useQuery(api.psych.eventsSince, worldId ? { worldId, since: 0 } : 'skip');

  const times = useMemo(() => Array.from(new Set((snapshots ?? []).map((s) => s.time))).sort((a, b) => a - b), [snapshots]);
  const byTime = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const s of snapshots ?? []) {
      if (!map.has(s.time)) map.set(s.time, []);
      map.get(s.time)!.push(s);
    }
    return map;
  }, [snapshots]);
  const trend = useMemo(() => {
    const t: number[] = [], stress: number[] = [], anxiety: number[] = [], joy: number[] = [];
    for (const tt of times) {
      const arr = byTime.get(tt)!;
      const n = arr.length || 1;
      t.push(tt);
      stress.push(arr.reduce((a, b) => a + b.stress, 0) / n);
      anxiety.push(arr.reduce((a, b) => a + b.emotion.anxiety, 0) / n);
      joy.push(arr.reduce((a, b) => a + b.emotion.joy, 0) / n);
    }
    return { t, stress, anxiety, joy };
  }, [times, byTime]);

  // Top N
  const latestTime = times[times.length - 1];
  const latest = useMemo(() => (snapshots ?? []).filter((s) => s.time === latestTime), [snapshots, latestTime]);
  const topN = useMemo(() => [...latest].sort((a, b) => b.risk - a.risk).slice(0, 5), [latest]);

  return (
    <div className="p-4 text-white">
      <h1 className="text-3xl">班级仪表盘</h1>
      <a className="underline" href="/ai-town">返回小镇</a>
      <section className="mt-4">
        <h2 className="text-xl">全班趋势（平均）</h2>
        <SimpleMultiLine labels={['stress', 'anxiety', 'joy']} series={[trend.stress, trend.anxiety, trend.joy]} t={trend.t} />
      </section>
      <section className="mt-4">
        <h2 className="text-xl">事件数量（累计）</h2>
        <EventCounts events={events ?? []} />
      </section>
      <section className="mt-4">
        <h2 className="text-xl">分布视图（最新时刻）</h2>
        <Histogram values={(latest ?? []).map((x) => x.stress)} bins={10} />
      </section>
      <section className="mt-4">
        <h2 className="text-xl">Top N 风险关注</h2>
        <ul>
          {topN.map((s) => (
            <li key={s.agentId}>{s.agentId}: risk={s.risk.toFixed(2)} stress={s.stress.toFixed(2)}</li>
          ))}
        </ul>
      </section>
      <section className="mt-4">
        <ExportCsv snapshots={snapshots ?? []} />
      </section>
    </div>
  );
}

function SimpleMultiLine({ t, series, labels }: { t: number[]; series: number[][]; labels: string[] }) {
  const ref = useState<HTMLDivElement | null>(null)[0];
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [plot, setPlot] = useState<uPlot | null>(null);
  const data = useMemo(() => [t, ...series] as uPlot.AlignedData, [t, series]);
  useEffectOnce(() => {
    if (!el) return;
    const p = new uPlot({ width: 800, height: 200, series: [{}, ...labels.map((l) => ({ label: l }))] }, data, el);
    setPlot(p);
  }, [el]);
  useEffectOnce(() => {
    if (!plot) return;
    plot.setData(data);
  }, [plot, data]);
  return <div ref={setEl} />;
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
        <div key={i} className="bg-white" style={{ width: '20px', height: `${b * 5}px` }} />
      ))}
    </div>
  );
}

function EventCounts({ events }: { events: any[] }) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) m.set(e.kind, (m.get(e.kind) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [events]);
  return (
    <ul>
      {counts.map(([k, v]) => (
        <li key={k}>{k}: {v}</li>
      ))}
    </ul>
  );
}

function ExportCsv({ snapshots }: { snapshots: any[] }) {
  const download = () => {
    const header = ['time', 'agentId', 'stress', 'risk', 'joy', 'anxiety', 'sadness', 'anger', 'energy'];
    const rows = snapshots.map((s) => [s.time, s.agentId, s.stress, s.risk, s.emotion.joy, s.emotion.anxiety, s.emotion.sadness, s.emotion.anger, s.energy]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'snapshots.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  return <button className="border px-2 py-1" onClick={download}>导出 CSV</button>;
}

function useEffectOnce(fn: () => void, deps: any[] = []) {
  useEffect(fn, deps);
}
