import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

const EVENT_TYPES = [
  { id: 'mock_exam_bad', name: '模拟考不佳' },
  { id: 'mock_exam_good', name: '模拟考较好' },
  { id: 'family_violence', name: '家庭冲突' },
  { id: 'love', name: '恋爱' },
];

export default function EventSimulator() {
  const ws = useQuery(api.world.defaultWorldStatus);
  const worldId = ws?.worldId as any;
  const desc = useQuery(api.world.gameDescriptions, worldId ? { worldId } : 'skip');
  const worldState = useQuery(api.world.worldState, worldId ? { worldId } : 'skip');
  const worldNow = useQuery(api.time.getWorldNow, worldId ? { worldId } : 'skip') as number | undefined;
  const createEvent = useMutation(api.events.createEvent);

  const [open, setOpen] = useState(true);
  const [target, setTarget] = useState<'class' | 'agent'>('class');
  const [agentId, setAgentId] = useState<string>('');
  const [type, setType] = useState<string>(EVENT_TYPES[0].id);
  const [intensity, setIntensity] = useState<number>(0.6);
  const [durationHours, setDurationHours] = useState<number>(24);

  const agents = useMemo(() => {
    const nameByPlayer = new Map<string, string>();
    for (const pd of (desc?.playerDescriptions ?? []) as any[]) {
      nameByPlayer.set(pd.playerId, pd.name);
    }
    const ags = (worldState?.world.agents ?? []) as any[];
    return ags.map((ag) => ({ id: ag.id, name: nameByPlayer.get(ag.playerId) ?? ag.id }));
  }, [desc, worldState]);

  const submit = async () => {
    if (!worldNow) return;
    await createEvent({
      worldId,
      target,
      agentId: target === 'agent' ? agentId || agents[0]?.id : undefined,
      type,
      intensity,
      start: worldNow,
      end: durationHours > 0 ? worldNow + durationHours * 3600 * 1000 : undefined,
    } as any);
  };

  // 拖拽位置
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const saved = localStorage.getItem('eventSimPos');
    if (saved) return JSON.parse(saved);
    return { x: 16, y: 120 };
  });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ mx: number; my: number; x: number; y: number } | null>(null);
  function onMouseDown(e: React.MouseEvent) {
    setDragging(true);
    setDragStart({ mx: e.clientX, my: e.clientY, x: pos.x, y: pos.y });
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging || !dragStart) return;
    const nx = Math.max(8, dragStart.x + (e.clientX - dragStart.mx));
    const ny = Math.max(80, dragStart.y + (e.clientY - dragStart.my));
    setPos({ x: nx, y: ny });
  }
  function onMouseUp() {
    setDragging(false);
    setDragStart(null);
    localStorage.setItem('eventSimPos', JSON.stringify(pos));
  }

  if (!worldId) return null;

  return (
    <div className="fixed z-20 pointer-events-auto" style={{ left: pos.x, bottom: pos.y }} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      <div className="bg-slate-800/90 text-white p-3 rounded shadow-lg w-80 select-none">
        <div className="flex items-center justify-between cursor-move" onMouseDown={onMouseDown}>
          <div className="font-semibold">事件模拟器</div>
          <button className="text-sm underline" onClick={() => setOpen(!open)}>{open ? '折叠' : '展开'}</button>
        </div>
        {open && (
          <div className="mt-2 space-y-2 text-sm">
            <div>
              <label className="mr-2">目标</label>
              <select className="text-black" value={target} onChange={(e) => setTarget(e.target.value as any)}>
                <option value="class">全班</option>
                <option value="agent">单人</option>
              </select>
            </div>
            {target === 'agent' && (
              <div>
                <label className="mr-2">角色</label>
                <select className="text-black" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mr-2">类型</label>
              <select className="text-black" value={type} onChange={(e) => setType(e.target.value)}>
                {EVENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mr-2">强度</label>
              <input className="w-24 text-black" type="number" min={0} max={1} step={0.1} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} />
            </div>
            <div>
              <label className="mr-2">持续（小时）</label>
              <input className="w-24 text-black" type="number" min={0} step={1} value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))} />
            </div>
            <button className="mt-2 w-full bg-indigo-500 hover:bg-indigo-600 text-white py-1 rounded" onClick={submit}>创建事件</button>
          </div>
        )}
      </div>
    </div>
  );
}
