import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState } from 'react';
import { useSimClock } from '@/hooks/useSimClock';

const EVENT_KINDS = [
  'mock_exam',
  'quiz_low_score',
  'quiz_high_score',
  'teacher_praise',
  'peer_conflict',
  'peer_support',
  'parent_pressure',
  'extra_homework',
  'self_reflection',
  'club_activity',
] as const;

export default function EventPanel() {
  const { worldId, simHours } = useSimClock();
  const states = useQuery(api.psych.currentStates, worldId ? { worldId } : 'skip');
  const applyEvent = useMutation(api.psych.applyEvent);
  const [actor, setActor] = useState<string>('');
  const [kind, setKind] = useState<string>('mock_exam');
  const [intensity, setIntensity] = useState<number>(0.6);

  const actors = states?.map((s) => ({ id: s.agentId, name: s.name })) ?? [];
  const submit = async () => {
    if (!worldId || !actor) return;
    const event = { id: 'ui-' + Date.now(), kind, time: simHours, actors: [actor], intensity } as any;
    await applyEvent({ worldId, event });
  };

  return (
    <div className="fixed left-2 bottom-2 z-10 bg-[rgb(53,59,89)] border border-[rgb(23,20,33)] p-2 text-white text-sm">
      <div className="font-bold">事件面板</div>
      <div className="mt-1">
        <label>角色：</label>
        <select className="text-black" value={actor} onChange={(e) => setActor(e.target.value)}>
          <option value="">选择</option>
          {actors.map((a) => (
            <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
          ))}
        </select>
      </div>
      <div className="mt-1">
        <label>事件：</label>
        <select className="text-black" value={kind} onChange={(e) => setKind(e.target.value)}>
          {EVENT_KINDS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>
      <div className="mt-1">
        <label>强度：</label>
        <input className="text-black w-16" type="number" step="0.1" min={0} max={1} value={intensity} onChange={(e) => setIntensity(parseFloat(e.target.value))} />
      </div>
      <button className="mt-2 border px-2 py-1" onClick={submit}>触发</button>
    </div>
  );
}

