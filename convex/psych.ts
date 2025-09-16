import { v } from 'convex/values';
import { mutation, query, internalMutation } from './_generated/server';
import { Id } from './_generated/dataModel';
import { BaseImpact, TraitModifiers, Social, Decay, RiskWeights, clamp, tanh, sigmoid01 } from './psychConfig';

type Emotion = { joy: number; anxiety: number; sadness: number; anger: number };
type Trait = { extraversion: number; neuroticism: number; conscientiousness: number; openness: number; agreeableness: number };

function personalModifier(kind: string, t: Trait): number {
  let mod = 0;
  const negativeKinds = ['quiz_low_score', 'peer_conflict', 'parent_pressure', 'extra_homework'];
  const positiveKinds = ['quiz_high_score', 'teacher_praise', 'peer_support'];
  const socialKinds = ['peer_conflict', 'peer_support', 'club_activity'];
  if (negativeKinds.includes(kind)) mod += TraitModifiers.negativeSensitivityByNeuroticism * t.neuroticism;
  if (positiveKinds.includes(kind)) mod += TraitModifiers.positiveBoostByConscientiousness * t.conscientiousness;
  if (socialKinds.includes(kind)) {
    mod -= TraitModifiers.socialBufferByAgreeableness * t.agreeableness;
    if (kind === 'peer_support') mod += TraitModifiers.supportAmplifyByExtraversion * t.extraversion;
  }
  return mod;
}

function applyMoodDelta(e: Emotion, delta: number): Emotion {
  let joy = e.joy, anx = e.anxiety, sad = e.sadness, ang = e.anger;
  if (delta >= 0) {
    joy = clamp(tanh(joy + delta));
    sad = clamp(tanh(sad - delta * 0.5));
    anx = clamp(tanh(anx - delta * 0.3));
    ang = clamp(tanh(ang - delta * 0.2));
  } else {
    const m = -delta;
    joy = clamp(tanh(joy - m));
    sad = clamp(tanh(sad + m * 0.6));
    anx = clamp(tanh(anx + m * 0.7));
    ang = clamp(tanh(ang + m * 0.4));
  }
  return { joy, anxiety: anx, sadness: sad, anger: ang };
}

function computeRisk(stress: number, emotion: Emotion, support: number): number {
  const x = RiskWeights.wStress * stress + RiskWeights.wAnxiety * Math.max(0, emotion.anxiety) + RiskWeights.wSadness * Math.max(0, emotion.sadness) - RiskWeights.wJoy * Math.max(0, emotion.joy) - RiskWeights.wSupport * support;
  return sigmoid01(x);
}

export const initStates = mutation({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, { worldId }) => {
    const world = await ctx.db.get(worldId);
    if (!world) throw new Error('World not found');
    // If states exist, skip
    const exists = await ctx.db.query('psychStates').withIndex('byWorld', (q) => q.eq('worldId', worldId)).first();
    if (exists) return;
    // Basic traits default
    const defaultTrait: Trait = { extraversion: 0.5, neuroticism: 0.5, conscientiousness: 0.5, openness: 0.5, agreeableness: 0.5 };
    for (const agent of world.agents) {
      // 从 playerDescriptions 读取可读姓名
      let name = 'Student';
      const playerDesc = await ctx.db
        .query('playerDescriptions')
        .withIndex('worldId', (q) => q.eq('worldId', worldId).eq('playerId', agent.playerId))
        .first();
      if (playerDesc?.name) name = playerDesc.name;
      const gradeClass = 'G3-1';
      const emotion: Emotion = { joy: 0, anxiety: 0, sadness: 0, anger: 0 };
      const stress = 0.3;
      const energy = 0.7;
      const support = 0.5;
      const risk = computeRisk(stress, emotion, support);
      await ctx.db.insert('psychStates', {
        worldId, agentId: agent.id, name, gradeClass,
        emotion, stress, risk, energy,
        ties: [], memoryKeys: [],
      });
    }
  },
});

export const applyEvent = mutation({
  args: {
    worldId: v.id('worlds'),
    event: v.object({ id: v.string(), kind: v.string(), time: v.number(), actors: v.array(v.string()), intensity: v.number(), location: v.optional(v.string()), payload: v.optional(v.any()) }),
  },
  handler: async (ctx, { worldId, event }) => {
    const base = BaseImpact[event.kind] ?? { mood: 0, stress: 0 };
    await ctx.db.insert('psychEvents', { worldId, ...event });
    for (const actor of event.actors) {
      const s = await ctx.db.query('psychStates').withIndex('byAgent', (q) => q.eq('worldId', worldId).eq('agentId', actor)).first();
      if (!s) continue;
      const traits: Trait = { extraversion: 0.5, neuroticism: 0.5, conscientiousness: 0.5, openness: 0.5, agreeableness: 0.5 };
      const mod = personalModifier(event.kind, traits);
      const scale = event.intensity * (1 + mod);
      const moodDelta = base.mood * scale;
      const stressDelta = base.stress * scale;
      const emotion = applyMoodDelta(s.emotion, moodDelta);
      let stress = clamp(tanh(s.stress + stressDelta), 0, 1);
      // 能量微调
      const energyDeltaMap: Record<string, number> = { extra_homework: -0.1, mock_exam: -0.08, peer_support: 0.05, club_activity: 0.06, self_reflection: 0.03 };
      const energy = clamp(tanh(s.energy + (energyDeltaMap[event.kind] ?? 0)), 0, 1);
      const support = 0.5; // 简化
      const risk = computeRisk(stress, emotion, support);
      await ctx.db.patch(s._id, { emotion, stress, energy, risk });
      await ctx.db.insert('psychSnapshots', { worldId, time: event.time, agentId: s.agentId, emotion, stress, risk, energy });
    }
  },
});

export const tick = mutation({
  args: { worldId: v.id('worlds'), dtHours: v.number(), time: v.number() },
  handler: async (ctx, { worldId, dtHours, time }) => {
    const states = await ctx.db.query('psychStates').withIndex('byWorld', (q) => q.eq('worldId', worldId)).collect();
    // 简化传播：不访问世界对话，仅按 ties
    for (const s of states) {
      // 衰减
      const decay = (x: number) => x * Math.max(0, 1 - Decay.emotionReturnRatePerHour * dtHours);
      const emotion: Emotion = {
        joy: tanh(decay(s.emotion.joy)),
        anxiety: tanh(decay(s.emotion.anxiety)),
        sadness: tanh(decay(s.emotion.sadness)),
        anger: tanh(decay(s.emotion.anger)),
      };
      let stress = clamp(tanh(s.stress - Decay.stressDecayPerHour * dtHours), 0, 1);
      let energy = clamp(tanh(s.energy + Decay.energyRecoveryPerHour * dtHours), 0, 1);
      // 传播（一次邻居影响）
      let dJoy = 0, dAnx = 0, dSad = 0, dAng = 0;
      for (const t of s.ties) {
        const n = states.find((x) => x.agentId === t.targetId);
        if (!n) continue;
        const base = dtHours * Social.k_spread * t.weight;
        const negAmp = n.emotion.sadness + n.emotion.anxiety + n.emotion.anger > 0 ? Social.negativeAmplify : 1;
        dJoy += base * n.emotion.joy;
        dAnx += base * n.emotion.anxiety * negAmp;
        dSad += base * n.emotion.sadness * negAmp;
        dAng += base * n.emotion.anger * negAmp;
      }
      const e2: Emotion = {
        joy: tanh((emotion.joy + dJoy) * Social.decay),
        anxiety: tanh((emotion.anxiety + dAnx) * Social.decay),
        sadness: tanh((emotion.sadness + dSad) * Social.decay),
        anger: tanh((emotion.anger + dAng) * Social.decay),
      };
      const support = 0.5; // 简化
      const risk = computeRisk(stress, e2, support);
      await ctx.db.patch(s._id, { emotion: e2, stress, energy, risk });
      await ctx.db.insert('psychSnapshots', { worldId, time, agentId: s.agentId, emotion: e2, stress, risk, energy });
    }
  },
});

export const currentStates = query({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, { worldId }) => {
    return await ctx.db.query('psychStates').withIndex('byWorld', (q) => q.eq('worldId', worldId)).collect();
  },
});

export const eventsSince = query({
  args: { worldId: v.id('worlds'), since: v.optional(v.number()) },
  handler: async (ctx, { worldId, since }) => {
    let q = ctx.db.query('psychEvents').withIndex('byWorldTime', (q) => q.eq('worldId', worldId));
    if (since) q = q.filter((x) => x.gte(x.field('time'), since));
    return await q.collect();
  },
});

export const snapshotsRange = query({
  args: { worldId: v.id('worlds'), start: v.number(), end: v.number() },
  handler: async (ctx, { worldId, start, end }) => {
    const rows = await ctx.db
      .query('psychSnapshots')
      .withIndex('byWorldTime', (q) => q.eq('worldId', worldId))
      .filter((q) => q.gte(q.field('time'), start))
      .filter((q) => q.lte(q.field('time'), end))
      .collect();
    return rows;
  },
});
