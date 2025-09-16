import { v } from 'convex/values';
import { mutation, query, internalQuery } from './_generated/server';
import { internal as apiInternal } from './_generated/api';

export const createEvent = mutation({
  args: {
    worldId: v.id('worlds'),
    target: v.union(v.literal('agent'), v.literal('class')),
    agentId: v.optional(v.string()),
    type: v.string(),
    intensity: v.number(),
    start: v.number(),
    end: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.target === 'agent' && !args.agentId) throw new Error('agentId required');
    await ctx.db.insert('events', args);
    // 立刻应用事件影响到情绪与快照，提升可见性
    try {
      // 调用内部心理引擎累加器（已按指数衰减计算并写 psychSnapshots）
      await ctx.runMutation(apiInternal.psych.applyActiveEvents, { worldId: args.worldId });
    } catch (e) {
      console.warn('applyActiveEvents after createEvent failed', e);
    }
  },
});

export const listActiveEvents = internalQuery({
  args: { worldId: v.id('worlds'), now: v.number(), agentId: v.optional(v.string()) },
  handler: async (ctx, { worldId, now, agentId }) => {
    const events = await ctx.db
      .query('events')
      .withIndex('byWorldTime', (q) => q.eq('worldId', worldId))
      .filter((q) => q.lte(q.field('start'), now))
      .collect();
    return events.filter((e) => (e.end == null || now < e.end) && (!agentId || e.target === 'class' || e.agentId === agentId));
  },
});
