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

