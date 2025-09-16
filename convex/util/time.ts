import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';

export const getWorldNow = internalQuery({
  args: { worldId: v.id('worlds'), realNow: v.optional(v.number()) },
  handler: async (ctx, { worldId, realNow }) => {
    const ws = await ctx.db.query('worldSettings').withIndex('byWorld', (q) => q.eq('worldId', worldId)).first();
    const now = realNow ?? Date.now();
    if (!ws) return now; // fallback to real time
    const delta = now - ws.updatedAt;
    return ws.worldNowMs + delta * ws.timeScale;
  },
});

export const setTimeScale = internalMutation({
  args: { worldId: v.id('worlds'), timeScale: v.number() },
  handler: async (ctx, { worldId, timeScale }) => {
    const now = Date.now();
    const ws = await ctx.db.query('worldSettings').withIndex('byWorld', (q) => q.eq('worldId', worldId)).first();
    if (!ws) {
      await ctx.db.insert('worldSettings', { worldId, timeScale, worldNowMs: now, updatedAt: now });
      return;
    }
    // Advance worldNow to current before changing scale
    const advanced = ws.worldNowMs + (now - ws.updatedAt) * ws.timeScale;
    await ctx.db.patch(ws._id, { timeScale, worldNowMs: advanced, updatedAt: now });
  },
});

