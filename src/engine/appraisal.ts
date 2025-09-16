import { AgentState, WorldContext } from '@/types/agent';
import { WorldEvent, EventKind } from '@/types/event';
import { BaseImpact, TraitModifiers, clamp, tanh } from '@/config/weights';

function personalModifier(kind: EventKind, a: AgentState): number {
  const t = a.traits;
  let mod = 0;
  // 负性类：quiz_low_score, peer_conflict, parent_pressure, extra_homework
  const negativeKinds: EventKind[] = [
    'quiz_low_score',
    'peer_conflict',
    'parent_pressure',
    'extra_homework',
  ];
  const positiveKinds: EventKind[] = ['quiz_high_score', 'teacher_praise', 'peer_support'];
  const socialKinds: EventKind[] = ['peer_conflict', 'peer_support', 'club_activity'];

  if (negativeKinds.includes(kind)) {
    mod += TraitModifiers.negativeSensitivityByNeuroticism * t.neuroticism; // 0..1
  }
  if (positiveKinds.includes(kind)) {
    mod += TraitModifiers.positiveBoostByConscientiousness * t.conscientiousness;
  }
  if (socialKinds.includes(kind)) {
    mod -= TraitModifiers.socialBufferByAgreeableness * t.agreeableness; // 缓冲
    if (kind === 'peer_support') {
      mod += TraitModifiers.supportAmplifyByExtraversion * t.extraversion;
    }
  }
  return mod; // 可为负
}

function applyMoodDelta(a: AgentState, moodDelta: number): AgentState {
  const e = { ...a.emotion };
  if (moodDelta >= 0) {
    e.joy = clamp(tanh(e.joy + moodDelta));
    e.sadness = clamp(tanh(e.sadness - moodDelta * 0.5));
    e.anxiety = clamp(tanh(e.anxiety - moodDelta * 0.3));
    e.anger = clamp(tanh(e.anger - moodDelta * 0.2));
  } else {
    const m = -moodDelta;
    e.joy = clamp(tanh(e.joy - m));
    e.sadness = clamp(tanh(e.sadness + m * 0.6));
    e.anxiety = clamp(tanh(e.anxiety + m * 0.7));
    e.anger = clamp(tanh(e.anger + m * 0.4));
  }
  return { ...a, emotion: e };
}

export function applyEvent(a: AgentState, e: WorldEvent, _ctx: WorldContext): AgentState {
  const base = BaseImpact[e.kind] ?? { mood: 0, stress: 0 };
  const mod = personalModifier(e.kind, a);
  const scale = e.intensity * (1 + mod);
  const moodDelta = base.mood * scale;
  const stressDelta = base.stress * scale;
  let next = applyMoodDelta(a, moodDelta);
  next.stress = clamp(tanh(next.stress + stressDelta), 0, 1);
  // 事件影响能量：学习任务消耗，社交/休息类略回能
  const energyDeltaMap: Partial<Record<EventKind, number>> = {
    extra_homework: -0.1,
    mock_exam: -0.08,
    peer_support: 0.05,
    club_activity: 0.06,
    self_reflection: 0.03,
  };
  const dE = energyDeltaMap[e.kind] ?? 0;
  next.energy = clamp(tanh(next.energy + dE), 0, 1);
  return next;
}

