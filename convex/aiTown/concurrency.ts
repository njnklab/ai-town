import { v } from 'convex/values';
import { mutation, internalMutation } from '../_generated/server';

export const acquire = mutation({
  args: { worldId: v.id('worlds'), name: v.string(), limit: v.number() },
  handler: async (ctx, { worldId, name, limit }) => {
    let row = await ctx.db.query('semaphores').withIndex('byWorldName', (q) => q.eq('worldId', worldId).eq('name', name)).first();
    if (!row) {
      const id = await ctx.db.insert('semaphores', { worldId, name, count: 0 });
      row = await ctx.db.get(id);
    }
    if (row!.count >= limit) return { ok: false, count: row!.count } as const;
    await ctx.db.patch(row!._id, { count: row!.count + 1 });
    return { ok: true, count: row!.count + 1 } as const;
  },
});

export const release = internalMutation({
  args: { worldId: v.id('worlds'), name: v.string() },
  handler: async (ctx, { worldId, name }) => {
    const row = await ctx.db.query('semaphores').withIndex('byWorldName', (q) => q.eq('worldId', worldId).eq('name', name)).first();
    if (!row) return;
    await ctx.db.patch(row._id, { count: Math.max(0, row.count - 1) });
  },
});

