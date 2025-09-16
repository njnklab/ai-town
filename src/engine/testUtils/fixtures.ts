import { AgentState, WorldContext } from '@/types/agent';

export function agentBase(id = 'a1'): AgentState {
  return {
    id,
    name: 'Alice',
    gradeClass: 'G3-1',
    traits: {
      extraversion: 0.5,
      neuroticism: 0.5,
      conscientiousness: 0.5,
      openness: 0.5,
      agreeableness: 0.5,
    },
    emotion: { joy: 0, anxiety: 0, sadness: 0, anger: 0 },
    stress: 0.3,
    riskScore: 0.0,
    energy: 0.6,
    ties: [],
    memoryKeys: [],
  };
}

export const ctxBase: WorldContext = { now: 0 };

