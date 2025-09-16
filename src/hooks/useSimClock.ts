import { useEffect, useMemo, useRef, useState } from 'react';
import { HOURS_PER_TICK_SIM, TICK_MS_REAL } from '@/config/time';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function useSimClock() {
  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId as any;
  const tick = useMutation(api.psych.tick);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [paused, setPaused] = useState(false);
  const [simHours, setSimHours] = useState(0);
  const lastTickRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!worldId) return;
    const id = setInterval(async () => {
      if (paused) return;
      const dtHours = HOURS_PER_TICK_SIM * speed;
      const nextHours = simHours + dtHours;
      setSimHours(nextHours);
      try {
        await tick({ worldId, dtHours, time: nextHours });
      } catch (e) {
        // ignore errors in demo
      }
      lastTickRef.current = Date.now();
    }, TICK_MS_REAL);
    return () => clearInterval(id);
  }, [worldId, speed, paused, simHours, tick]);

  return {
    speed,
    setSpeed,
    paused,
    setPaused,
    simHours,
    setSimHours,
    worldId,
  } as const;
}

