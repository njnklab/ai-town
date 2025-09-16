// Convex 端的心理引擎参数（与 src/config/weights.ts 保持一致的默认）
export const BaseImpact: Record<string, { mood: number; stress: number }> = {
  quiz_low_score: { mood: -0.5, stress: 0.4 },
  quiz_high_score: { mood: 0.5, stress: -0.2 },
  teacher_praise: { mood: 0.4, stress: -0.1 },
  peer_conflict: { mood: -0.6, stress: 0.5 },
  peer_support: { mood: 0.3, stress: -0.2 },
  parent_pressure: { mood: -0.4, stress: 0.5 },
  extra_homework: { mood: -0.2, stress: 0.3 },
  mock_exam: { mood: 0.0, stress: 0.4 },
  self_reflection: { mood: 0.1, stress: -0.05 },
  club_activity: { mood: 0.3, stress: -0.1 },
};

export const TraitModifiers = {
  negativeSensitivityByNeuroticism: 0.5,
  positiveBoostByConscientiousness: 0.4,
  socialBufferByAgreeableness: 0.3,
  supportAmplifyByExtraversion: 0.2,
};

export const Social = {
  k_spread: 0.2,
  negativeAmplify: 1.2,
  decay: 0.6,
};

export const Decay = {
  emotionReturnRatePerHour: 0.15,
  stressDecayPerHour: 0.05,
  energyRecoveryPerHour: 0.2,
};

export const RiskWeights = {
  wStress: 1.0,
  wAnxiety: 0.9,
  wSadness: 0.6,
  wJoy: 0.7,
  wSupport: 0.8,
};

export const clamp = (x: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, x));
export const tanh = (x: number) => Math.tanh(x);
export const sigmoid01 = (x: number) => 1 / (1 + Math.exp(-x));

// Simple mapping for prompt-side event effects
export const EVENT_EFFECTS: Record<string, { dStress: number; dAnxiety: number; dJoy: number }> = {
  family_violence: { dStress: +0.5, dAnxiety: +0.4, dJoy: -0.5 },
  mock_exam_bad: { dStress: +0.3, dAnxiety: +0.2, dJoy: -0.3 },
  love: { dStress: -0.1, dAnxiety: +0.1, dJoy: +0.4 },
  mock_exam_good: { dStress: -0.2, dAnxiety: -0.1, dJoy: +0.5 },
};

export const EVENT_PROMPT_HINTS: Record<
  string,
  { summary: string; tone: string }
> = {
  family_violence: {
    summary: '遭遇家庭冲突/压力',
    tone: '情绪波动大，先稳住对方情绪，再给具体可执行的支持或求助建议。',
  },
  mock_exam_bad: {
    summary: '模拟考发挥不佳，状态受挫',
    tone: '语气里带点遗憾与共情，提醒拆解问题、安排复盘。',
  },
  mock_exam_good: {
    summary: '模拟考表现不错',
    tone: '语气可以轻松些，但别自满，提醒巩固。',
  },
  love: {
    summary: '陷入/萌芽一段校园恋爱',
    tone: '语气柔和，关心情绪同时提醒把握学习节奏。',
  },
};
