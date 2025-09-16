export const SIM_START_AT = Date.parse('2025-05-10T08:00:00+08:00');
export const REAL_TO_SIM_SCALE = parseFloat(process.env.SIM_TIME_SCALE ?? '300');
export const SCHOOL_START_HOUR = 8;
export const SCHOOL_END_HOUR = 18;

function clampToSchoolHours(date: Date) {
  const d = new Date(date);
  const hour = d.getHours();
  if (hour < SCHOOL_START_HOUR) {
    d.setHours(SCHOOL_START_HOUR, 0, 0, 0);
  }
  if (hour >= SCHOOL_END_HOUR) {
    d.setHours(SCHOOL_END_HOUR, 0, 0, 0);
  }
  return d;
}

export function toSimTime(worldBootMs: number | null, nowMs: number) {
  if (!worldBootMs) {
    return clampToSchoolHours(new Date(SIM_START_AT));
  }
  const elapsedReal = Math.max(0, nowMs - worldBootMs);
  const simMs = SIM_START_AT + elapsedReal * REAL_TO_SIM_SCALE;
  return clampToSchoolHours(new Date(simMs));
}

export function simDateKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}
