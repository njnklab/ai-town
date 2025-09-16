import { AgentState } from '@/types/agent';
import { Decay, clamp, tanh } from '@/config/weights';

export function decayState(a: AgentState, dtHours: number): AgentState {
  // 情绪回归 0
  const decay = (v: number) => v * Math.max(0, 1 - Decay.emotionReturnRatePerHour * dtHours);
  const emotion = {
    joy: tanh(decay(a.emotion.joy)),
    anxiety: tanh(decay(a.emotion.anxiety)),
    sadness: tanh(decay(a.emotion.sadness)),
    anger: tanh(decay(a.emotion.anger)),
  };
  // 压力缓慢下降，能量恢复
  const stress = clamp(tanh(a.stress - Decay.stressDecayPerHour * dtHours), 0, 1);
  const energy = clamp(tanh(a.energy + Decay.energyRecoveryPerHour * dtHours), 0, 1);
  return { ...a, emotion, stress, energy };
}

