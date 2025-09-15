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
});
