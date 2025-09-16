import { v } from 'convex/values';
import { internalMutation, query } from './_generated/server';
import { internal as apiInternal } from './_generated/api';

function dayStr(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const aggregateDailyStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const worlds = await ctx.db.query('worlds').collect();
    const nowReal = Date.now();
    for (const w of worlds) {
      const stats = new Map<
        string,
        {
          day: string;
          agentId: string;
          stressSum: number;
          anxietySum: number;
          joySum: number;
          count: number;
          eventPersonal: number;
        }
      >();
      const classEventsByDay = new Map<string, number>();

      const worldNow = await ctx.runQuery(apiInternal.util.time.getWorldNow, {
        worldId: w._id,
        realNow: nowReal,
      });
      const rangeStart = worldNow - 7 * 24 * 3600 * 1000;

      const accumulate = (day: string, agentId: string, stress: number, anxiety: number, joy: number) => {
        const key = `${day}::${agentId}`;
        const existing = stats.get(key);
        if (existing) {
          existing.stressSum += stress;
          existing.anxietySum += anxiety;
          existing.joySum += joy;
          existing.count += 1;
        } else {
          stats.set(key, {
            day,
            agentId,
            stressSum: stress,
            anxietySum: anxiety,
            joySum: joy,
            count: 1,
            eventPersonal: 0,
          });
        }
      };

      let cursor: string | null = null;
      do {
        const page = await ctx.db
          .query('psychSnapshots')
          .withIndex('byWorldTime', (q) => q.eq('worldId', w._id))
          .filter((q) => q.gte(q.field('time'), rangeStart))
          .paginate({ cursor, numItems: 1000 });
        for (const snap of page.page) {
          const day = dayStr(snap.time);
          accumulate(day, snap.agentId, snap.stress, snap.emotion.anxiety, snap.emotion.joy);
        }
        cursor = page.continueCursor;
      } while (cursor);

      let eventCursor: string | null = null;
      do {
        const page = await ctx.db
          .query('events')
          .withIndex('byWorldTime', (q) => q.eq('worldId', w._id))
          .filter((q) => q.gte(q.field('start'), rangeStart))
          .paginate({ cursor: eventCursor, numItems: 500 });
        for (const e of page.page) {
          const day = dayStr(e.start);
          if (e.target === 'class') {
            classEventsByDay.set(day, (classEventsByDay.get(day) ?? 0) + 1);
          } else if (e.agentId) {
            const key = `${day}::${e.agentId}`;
            const existing = stats.get(key);
            if (existing) {
              existing.eventPersonal += 1;
            } else {
              stats.set(key, {
                day,
                agentId: e.agentId,
                stressSum: 0,
                anxietySum: 0,
                joySum: 0,
                count: 0,
                eventPersonal: 1,
              });
            }
          }
        }
        eventCursor = page.continueCursor;
      } while (eventCursor);

      const currentStates = await ctx.db
        .query('psychStates')
        .withIndex('byWorld', (q) => q.eq('worldId', w._id))
        .collect();
      const today = dayStr(worldNow);
      for (const s of currentStates) {
        accumulate(today, s.agentId, s.stress, s.emotion.anxiety, s.emotion.joy);
      }

      for (const entry of stats.values()) {
        if (entry.count === 0) continue;
        const stressAvg = entry.stressSum / entry.count;
        const anxietyAvg = entry.anxietySum / entry.count;
        const joyAvg = entry.joySum / entry.count;
        const eventsCount = (classEventsByDay.get(entry.day) ?? 0) + entry.eventPersonal;
        const existing = await ctx.db
          .query('agentDailyStats')
          .withIndex('byWorldAgentDay', (q) =>
            q.eq('worldId', w._id).eq('agentId', entry.agentId).eq('day', entry.day),
          )
          .first();
        if (existing) {
          await ctx.db.patch(existing._id, { stressAvg, anxietyAvg, joyAvg, eventsCount });
        } else {
          await ctx.db.insert('agentDailyStats', {
            worldId: w._id,
            agentId: entry.agentId,
            day: entry.day,
            stressAvg,
            anxietyAvg,
            joyAvg,
            eventsCount,
          });
        }
      }
    }
  },
});

export const classTrends = query({
  args: { worldId: v.id('worlds'), from: v.string(), to: v.string() },
  handler: async (ctx, { worldId, from, to }) => {
    const rows = await ctx.db
      .query('agentDailyStats')
      .withIndex('byWorldDay', (q) => q.eq('worldId', worldId))
      .filter((q) => q.gte(q.field('day'), from))
      .filter((q) => q.lte(q.field('day'), to))
      .collect();
    const byDay = new Map<string, any[]>();
    for (const r of rows) {
      const arr = (byDay.get(r.day) as any[]) ?? [];
      arr.push(r);
      byDay.set(r.day, arr as any);
    }
    const out = Array.from(byDay.entries()).map(([day, arr]) => {
      const n = arr.length || 1;
      return {
        day,
        stressAvg: arr.reduce((a, b) => a + b.stressAvg, 0) / n,
        anxietyAvg: arr.reduce((a, b) => a + b.anxietyAvg, 0) / n,
        joyAvg: arr.reduce((a, b) => a + b.joyAvg, 0) / n,
      };
    });
    out.sort((a, b) => (a.day < b.day ? -1 : 1));
    return out;
  },
});

export const distributionLatest = query({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, { worldId }) => {
    const rows = await ctx.db
      .query('agentDailyStats')
      .withIndex('byWorldDay', (q) => q.eq('worldId', worldId))
      .order('desc')
      .take(2000);
    const latestDay = rows[0]?.day;
    return rows.filter((r) => r.day === latestDay);
  },
});

export const topNPeers = query({
  args: { worldId: v.id('worlds'), metric: v.string(), n: v.number() },
  handler: async (ctx, { worldId, metric, n }) => {
    // naive: compare last 7 vs previous 7 averages
    const all = await ctx.db
      .query('agentDailyStats')
      .withIndex('byWorldDay', (q) => q.eq('worldId', worldId))
      .order('desc')
      .take(10000);
    const byAgent = new Map<string, any[]>();
    for (const r of all) {
      const arr = (byAgent.get(r.agentId) as any[]) ?? [];
      arr.push(r);
      byAgent.set(r.agentId, arr as any);
    }
    const changes: { agentId: string; delta: number }[] = [];
    for (const [agentId, arr] of byAgent) {
      const last7 = arr.slice(0, 7);
      const prev7 = arr.slice(7, 14);
      if (last7.length < 3 || prev7.length < 3) continue;
      const avg = (xs: any[], f: (x: any) => number) => xs.reduce((a, b) => a + f(b), 0) / xs.length;
      const pick = (r: any) => (metric === 'stress' ? r.stressAvg : metric === 'anxiety' ? r.anxietyAvg : r.joyAvg);
      const delta = avg(prev7, pick) - avg(last7, pick); // drop means improvement
      changes.push({ agentId, delta });
    }
    changes.sort((a, b) => b.delta - a.delta);
    return changes.slice(0, n);
  },
});

export const agentTrends = query({
  args: { worldId: v.id('worlds'), agentId: v.string(), from: v.string(), to: v.string() },
  handler: async (ctx, { worldId, agentId, from, to }) => {
    const rows = await ctx.db
      .query('agentDailyStats')
      .withIndex('byWorldAgentDay', (q) => q.eq('worldId', worldId).eq('agentId', agentId))
      .collect();
    const inRange = rows.filter((r) => r.day >= from && r.day <= to);
    inRange.sort((a, b) => (a.day < b.day ? -1 : 1));
    return inRange.map((r) => ({ day: r.day, stressAvg: r.stressAvg, anxietyAvg: r.anxietyAvg, joyAvg: r.joyAvg }));
  },
});

export const eventsRangeDays = query({
  args: { worldId: v.id('worlds'), from: v.string(), to: v.string() },
  handler: async (ctx, { worldId, from, to }) => {
    const start = new Date(from + 'T00:00:00').getTime();
    const end = new Date(to + 'T23:59:59').getTime();
    const rows = await ctx.db
      .query('events')
      .withIndex('byWorldTime', (q) => q.eq('worldId', worldId))
      .filter((q) => q.gte(q.field('start'), start))
      .filter((q) => q.lte(q.field('start'), end))
      .collect();
    const day = (ts: number) => {
      const d = new Date(ts);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    return rows
      .filter((e) => e.target === 'class')
      .map((e) => ({ day: day(e.start), type: e.type }));
  },
});

export const examsRangeDays = query({
  args: { worldId: v.id('worlds'), from: v.string(), to: v.string() },
  handler: async (ctx, { worldId, from, to }) => {
    const start = new Date(from + 'T00:00:00').getTime();
    const end = new Date(to + 'T23:59:59').getTime();
    const rows = await ctx.db
      .query('exams')
      .withIndex('byWorldTs', (q) => q.eq('worldId', worldId))
      .filter((q) => q.gte(q.field('ts'), start))
      .filter((q) => q.lte(q.field('ts'), end))
      .collect();
    const day = (ts: number) => {
      const d = new Date(ts);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    return rows.map((e) => ({ day: day(e.ts), name: e.name }));
  },
});
