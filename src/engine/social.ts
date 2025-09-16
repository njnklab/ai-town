import { AgentState } from '@/types/agent';
import { Social, clamp, tanh } from '@/config/weights';

// 根据邻居的情绪对当前 agent 情绪进行传播影响
export function spreadEmotion(a: AgentState, neighbors: AgentState[], k: number): AgentState {
  if (neighbors.length === 0) return a;
  let dJoy = 0,
    dAnx = 0,
    dSad = 0,
    dAng = 0;
  for (const n of neighbors) {
    const edge = a.ties.find((t) => t.targetId === n.id)?.weight ?? 0;
    const base = k * Social.k_spread * edge;
    const negAmp = n.emotion.sadness + n.emotion.anxiety + n.emotion.anger > 0 ? Social.negativeAmplify : 1;
    dJoy += base * n.emotion.joy;
    dAnx += base * n.emotion.anxiety * negAmp;
    dSad += base * n.emotion.sadness * negAmp;
    dAng += base * n.emotion.anger * negAmp;
  }
  const emotion = {
    joy: tanh((a.emotion.joy + dJoy) * Social.decay),
    anxiety: tanh((a.emotion.anxiety + dAnx) * Social.decay),
    sadness: tanh((a.emotion.sadness + dSad) * Social.decay),
    anger: tanh((a.emotion.anger + dAng) * Social.decay),
  };
  return { ...a, emotion: { ...emotion, joy: clamp(emotion.joy), anxiety: clamp(emotion.anxiety), sadness: clamp(emotion.sadness), anger: clamp(emotion.anger) } };
}

