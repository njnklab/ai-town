import { AgentState, WorldContext } from '@/types/agent';
import { BehaviorWeights, clamp, tanh } from '@/config/weights';

export type Behavior = 'study' | 'rest' | 'chat' | 'seek_help';

export function chooseBehavior(a: AgentState): Behavior {
  // 简单启发式：高压/低能量 → rest/seek_help；能量足且低压 → study；社交偏好影响 chat
  const s = a.stress;
  const e = a.energy;
  const t = a.traits;
  const score = {
    study: tanh((1 - s) + e) - BehaviorWeights.studyStressCost * s + BehaviorWeights.studyAchievementGain,
    rest: tanh(s + (1 - e)) + BehaviorWeights.restStressRelief + BehaviorWeights.restEnergyGain,
    chat: tanh(t.extraversion + (1 - s) * 0.3) + BehaviorWeights.chatStressRelief,
    seek_help: tanh(s * 1.2 + (1 - e) * 0.5) + BehaviorWeights.helpStressRelief + t.agreeableness * 0.2,
  };
  const entries = Object.entries(score) as Array<[Behavior, number]>;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export function applyBehavior(a: AgentState, behavior: Behavior): AgentState {
  // 行为影响（确定性）：
  switch (behavior) {
    case 'study':
      return {
        ...a,
        stress: clamp(tanh(a.stress + BehaviorWeights.studyStressCost), 0, 1),
        emotion: { ...a.emotion, joy: tanh(a.emotion.joy + BehaviorWeights.studyAchievementGain) },
        energy: clamp(tanh(a.energy - 0.1), 0, 1),
      };
    case 'rest':
      return {
        ...a,
        stress: clamp(tanh(a.stress - BehaviorWeights.restStressRelief), 0, 1),
        energy: clamp(tanh(a.energy + BehaviorWeights.restEnergyGain), 0, 1),
      };
    case 'chat':
      return {
        ...a,
        stress: clamp(tanh(a.stress - BehaviorWeights.chatStressRelief), 0, 1),
        emotion: { ...a.emotion, joy: tanh(a.emotion.joy + 0.05) },
      };
    case 'seek_help':
      return {
        ...a,
        stress: clamp(tanh(a.stress - BehaviorWeights.helpStressRelief), 0, 1),
        emotion: { ...a.emotion, anxiety: tanh(a.emotion.anxiety - 0.08) },
      };
  }
}

// 会话并发/队列（简化占位）：
export class ConversationSemaphore {
  private current = 0;
  constructor(private readonly limit = 3) {}
  tryAcquire(): boolean {
    if (this.current >= this.limit) return false;
    this.current++;
    return true;
  }
  release() {
    this.current = Math.max(0, this.current - 1);
  }
  count() {
    return this.current;
  }
}

