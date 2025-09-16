export type Emotion = { joy: number; anxiety: number; sadness: number; anger: number };
export type Trait = {
  extraversion: number;
  neuroticism: number;
  conscientiousness: number;
  openness: number;
  agreeableness: number;
};

export type SocialLink = { targetId: string; weight: number }; // -1..1

export interface AgentState {
  id: string;
  name: string;
  gradeClass: string;
  traits: Trait; // 稳定特质
  emotion: Emotion; // 即时情绪（-1..1）
  stress: number; // 0..1（综合压力）
  riskScore: number; // 0..1（用于预警）
  energy: number; // 0..1（疲劳/精力）
  ties: SocialLink[]; // 社交边
  memoryKeys: string[]; // 最近记忆 id
}

export interface WorldContext {
  // 支持未来扩展：班级/学校设定、全局参数、支持度估计等
  now: number; // 模拟时间戳（ms）
  supportIndexByAgent?: Record<string, number>; // 0..1 估计的支持度（可由 ties 推断）
}

