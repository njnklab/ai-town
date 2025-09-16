import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';

export const upsertFacts = internalMutation({
  args: {
    worldId: v.id('worlds'),
    agentId: v.string(),
    items: v.array(v.object({ key: v.string(), value: v.string(), score: v.number() })),
  },
  handler: async (ctx, { worldId, agentId, items }) => {
    const now = Date.now();
    for (const it of items) {
      const existing = await ctx.db
        .query('agentFacts')
        .withIndex('byWorldAgentKey', (q) => q.eq('worldId', worldId).eq('agentId', agentId).eq('key', it.key))
        .first();
      if (existing) {
        // Keep the higher score, update value when better
        const score = Math.max(existing.score, it.score);
        const value = it.score >= existing.score ? it.value : existing.value;
        await ctx.db.patch(existing._id, { value, score, updatedAt: now });
      } else {
        await ctx.db.insert('agentFacts', { worldId, agentId, ...it, updatedAt: now });
      }
    }
  },
});

export const topFacts = internalQuery({
  args: { worldId: v.id('worlds'), agentId: v.string(), k: v.number() },
  handler: async (ctx, { worldId, agentId, k }) => {
    const rows = await ctx.db
      .query('agentFacts')
      .withIndex('byWorldAgent', (q) => q.eq('worldId', worldId).eq('agentId', agentId))
      .collect();
    return rows.sort((a, b) => b.score - a.score).slice(0, k);
  },
});

