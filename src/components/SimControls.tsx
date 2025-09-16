import { useSimClock } from '@/hooks/useSimClock';
import { HOURS_PER_TICK_SIM } from '@/config/time';
import { useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export default function SimControls() {
  const { speed, setSpeed, paused, setPaused, simHours, worldId } = useSimClock();
  const states = useQuery(api.psych.currentStates, worldId ? { worldId } : 'skip');
  const initStates = useMutation(api.psych.initStates);
  useEffect(() => {
    if (worldId && Array.isArray(states) && states.length === 0) {
      void initStates({ worldId });
    }
  }, [worldId, states, initStates]);
  const days = Math.floor(simHours / 24);
  const hours = Math.floor(simHours % 24);
  return (
    <div className="fixed top-2 left-2 z-10 text-white text-sm bg-[rgb(53,59,89)] border border-[rgb(23,20,33)] p-2">
      <div>模拟时间：第 {days + 1} 天 {hours}:00</div>
      <div className="mt-1">速度：
        {[1, 2, 4].map((s) => (
          <button key={s} className={`mx-1 px-2 py-1 border ${speed === s ? 'bg-white text-black' : ''}`} onClick={() => setSpeed(s as 1 | 2 | 4)}>x{s}</button>
        ))}
        <button className="ml-2 px-2 py-1 border" onClick={() => setPaused(!paused)}>{paused ? '继续' : '暂停'}</button>
      </div>
      <div className="mt-1 text-[10px] opacity-80">每tick前进 {HOURS_PER_TICK_SIM} 小时</div>
    </div>
  );
}
