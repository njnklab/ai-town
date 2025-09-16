import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const setTimeScale = mutation({
  args: { worldId: v.id('worlds'), timeScale: v.number() },
  handler: async (ctx, { worldId, timeScale }) => {
    const now = Date.now();
    const ws = await ctx.db.query('worldSettings').withIndex('byWorld', (q) => q.eq('worldId', worldId)).first();
    if (!ws) {
      await ctx.db.insert('worldSettings', { worldId, timeScale, worldNowMs: now, updatedAt: now });
    } else {
      const advanced = ws.worldNowMs + (now - ws.updatedAt) * ws.timeScale;
      await ctx.db.patch(ws._id, { timeScale, worldNowMs: advanced, updatedAt: now });
    }
  },
});

export const getWorldNow = query({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, { worldId }) => {
    const ws = await ctx.db.query('worldSettings').withIndex('byWorld', (q) => q.eq('worldId', worldId)).first();
    const now = Date.now();
    if (!ws) return now;
    return ws.worldNowMs + (now - ws.updatedAt) * ws.timeScale;
  },
});

export const pauseTime = mutation({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, { worldId }) => {
    const now = Date.now();
    const ws = await ctx.db.query('worldSettings').withIndex('byWorld', (q) => q.eq('worldId', worldId)).first();
    if (!ws) {
      await ctx.db.insert('worldSettings', { worldId, timeScale: 0, worldNowMs: now, updatedAt: now });
    } else {
      const advanced = ws.worldNowMs + (now - ws.updatedAt) * ws.timeScale;
      await ctx.db.patch(ws._id, { timeScale: 0, worldNowMs: advanced, updatedAt: now });
    }
  },
});

export const stepDays = mutation({
  args: { worldId: v.id('worlds'), days: v.number() },
  handler: async (ctx, { worldId, days }) => {
    const realNow = Date.now();
    const ws = await ctx.db.query('worldSettings').withIndex('byWorld', (q) => q.eq('worldId', worldId)).first();
    const nowWorld = ws ? ws.worldNowMs + (realNow - ws.updatedAt) * ws.timeScale : realNow;
    const advanced = nowWorld + days * 24 * 3600 * 1000;
    if (ws) {
      await ctx.db.patch(ws._id, { worldNowMs: advanced, updatedAt: realNow });
    } else {
      await ctx.db.insert('worldSettings', { worldId, timeScale: 1, worldNowMs: advanced, updatedAt: realNow });
    }
  },
});
