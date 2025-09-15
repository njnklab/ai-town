// 模拟时间配置（可调）
export const TICK_MS_REAL = 1000; // 现实每 1s
export const HOURS_PER_TICK_SIM = 2; // 模拟前进 2 小时
export const WORLD_LENGTH_DAYS = 14; // 总共模拟 14 天

// 运行时控制：x1/x2/x4 倍速
export const SPEED_OPTIONS = [1, 2, 4] as const;
export type Speed = typeof SPEED_OPTIONS[number];

