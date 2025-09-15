import { AgentState, WorldContext } from '@/types/agent';
import { RiskWeights, sigmoid01 } from '@/config/weights';

export function computeRisk(a: AgentState, ctx: WorldContext): number {
  // support 估计：来自 ties 的正向边作为支持
  const supportFromTies = a.ties.reduce((acc, t) => (t.weight > 0 ? acc + t.weight : acc), 0);
  const support = Math.max(0, Math.min(1, (ctx.supportIndexByAgent?.[a.id] ?? 0.5) * 0.5 + supportFromTies * 0.1));
  const x =
    RiskWeights.wStress * a.stress +
    RiskWeights.wAnxiety * Math.max(0, a.emotion.anxiety) +
    RiskWeights.wSadness * Math.max(0, a.emotion.sadness) -
    RiskWeights.wJoy * Math.max(0, a.emotion.joy) -
    RiskWeights.wSupport * support;
  return sigmoid01(x);
}

