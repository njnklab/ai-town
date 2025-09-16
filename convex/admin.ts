import { mutation } from './_generated/server';
import { internal } from './_generated/api';

export const aggregateDailyStats = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(internal.dashboard.aggregateDailyStats, {});
  },
});

export const dailySummarizeAll = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(internal.crons.dailySummarizeAll, {});
  },
});

export const applyActiveEvents = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(internal.psych.applyActiveEventsAllWorlds, {});
  },
});

