import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { agentTables } from './agent/schema';
import { aiTownTables } from './aiTown/schema';
import { conversationId, playerId } from './aiTown/ids';
import { engineTables } from './engine/schema';

export default defineSchema({
  music: defineTable({
    storageId: v.string(),
    type: v.union(v.literal('background'), v.literal('player')),
  }),

  messages: defineTable({
    conversationId,
    messageUuid: v.string(),
    author: playerId,
    text: v.string(),
    worldId: v.optional(v.id('worlds')),
  })
    .index('conversationId', ['worldId', 'conversationId'])
    .index('messageUuid', ['conversationId', 'messageUuid']),

  ...agentTables,
  ...aiTownTables,
  ...engineTables,

  // 心理状态：每个 agent 一条当前状态
  psychStates: defineTable({
    worldId: v.id('worlds'),
    agentId: v.string(),
    name: v.string(),
    gradeClass: v.string(),
    emotion: v.object({ joy: v.number(), anxiety: v.number(), sadness: v.number(), anger: v.number() }),
    stress: v.number(),
    risk: v.number(),
    energy: v.number(),
    ties: v.array(v.object({ targetId: v.string(), weight: v.number() })),
    memoryKeys: v.array(v.string()),
    status: v.optional(v.string()),
    lastEvent: v.optional(v.string()),
  }).index('byWorld', ['worldId']).index('byAgent', ['worldId', 'agentId']),

  // 快照：时间序列，用于趋势/分布/个体轨迹
  psychSnapshots: defineTable({
    worldId: v.id('worlds'),
    time: v.number(),
    agentId: v.string(),
    emotion: v.object({ joy: v.number(), anxiety: v.number(), sadness: v.number(), anger: v.number() }),
    stress: v.number(),
    risk: v.number(),
    energy: v.number(),
  }).index('byWorldTime', ['worldId', 'time']).index('byAgentTime', ['worldId', 'agentId', 'time']),

  // 事件：用于堆叠柱/调试
  psychEvents: defineTable({
    worldId: v.id('worlds'),
    id: v.string(),
    kind: v.string(),
    time: v.number(),
    actors: v.array(v.string()),
    intensity: v.number(),
    location: v.optional(v.string()),
    payload: v.optional(v.any()),
  }).index('byWorldTime', ['worldId', 'time']),

  // 全局信号量：用于会话并发限流等
  semaphores: defineTable({
    worldId: v.id('worlds'),
    name: v.string(),
    count: v.number(),
  }).index('byWorldName', ['worldId', 'name']),

  // 事件：带持续时间，用于情绪与提示注入
  events: defineTable({
    worldId: v.id('worlds'),
    target: v.union(v.literal('agent'), v.literal('class')),
    agentId: v.optional(v.string()),
    type: v.string(),
    intensity: v.number(),
    start: v.number(),
    end: v.optional(v.number()),
  }).index('byWorldTime', ['worldId', 'start']),

  // 行为印记（长期事实）
  agentFacts: defineTable({
    worldId: v.id('worlds'),
    agentId: v.string(),
    key: v.string(),
    value: v.string(),
    score: v.number(),
    updatedAt: v.number(),
  }).index('byWorldAgentKey', ['worldId', 'agentId', 'key']).index('byWorldAgent', [
    'worldId',
    'agentId',
  ]),

  // Dashboard 日聚合
  agentDailyStats: defineTable({
    worldId: v.id('worlds'),
    agentId: v.string(),
    day: v.string(), // YYYY-MM-DD
    stressAvg: v.number(),
    anxietyAvg: v.number(),
    joyAvg: v.number(),
    eventsCount: v.number(),
    mockScore: v.optional(v.number()),
  }).index('byWorldAgentDay', ['worldId', 'agentId', 'day']).index('byWorldDay', [
    'worldId',
    'day',
  ]),

  // 模拟考试
  exams: defineTable({
    worldId: v.id('worlds'),
    name: v.string(),
    ts: v.number(),
    scores: v.array(v.object({ agentId: v.string(), score: v.number() })),
  }).index('byWorldTs', ['worldId', 'ts']),

  // 世界时钟设置
  worldSettings: defineTable({
    worldId: v.id('worlds'),
    timeScale: v.number(), // worldMs = realMs * timeScale
    worldNowMs: v.number(),
    updatedAt: v.number(),
  }).index('byWorld', ['worldId']),
});
