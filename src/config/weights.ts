// 事件/特质/传播/风险权重（课堂可调）

// 事件基础影响（正负号表示方向，单位：对情绪/压力的原始冲击）
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

// 个体特质对事件敏感度的调制（线性映射系数）
export const TraitModifiers = {
  negativeSensitivityByNeuroticism: 0.5, // 神经质↑，对负性更敏感
  positiveBoostByConscientiousness: 0.4, // 尽责↑，对成绩/表扬增益更强
  socialBufferByAgreeableness: 0.3, // 宜人性↑，社交类事件缓冲
  supportAmplifyByExtraversion: 0.2, // 外向↑，受同伴支持增益略强
};

// 情绪传播参数
export const Social = {
  k_spread: 0.2, // 基础传播系数
  negativeAmplify: 1.2, // 负面更强
  decay: 0.6, // 衰减（每次传播）
};

// 衰减/恢复
export const Decay = {
  emotionReturnRatePerHour: 0.15, // 每模拟小时向0回归比例
  stressDecayPerHour: 0.05,
  energyRecoveryPerHour: 0.2,
};

// 风险打分权重
export const RiskWeights = {
  wStress: 1.0,
  wAnxiety: 0.9,
  wSadness: 0.6,
  wJoy: 0.7,
  wSupport: 0.8,
};

// 行为选择权重（启发式）
export const BehaviorWeights = {
  studyStressCost: 0.15,
  studyAchievementGain: 0.1, // 成就期望（正向情绪）
  restStressRelief: 0.12,
  restEnergyGain: 0.25,
  chatStressRelief: 0.06,
  helpStressRelief: 0.18,
};

export const clamp = (x: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, x));
export const tanh = (x: number) => Math.tanh(x);
export const sigmoid01 = (x: number) => 1 / (1 + Math.exp(-x));

