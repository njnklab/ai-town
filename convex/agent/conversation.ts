import { v } from 'convex/values';
import { Doc, Id } from '../_generated/dataModel';
import { ActionCtx, internalQuery } from '../_generated/server';
import { LLMMessage, chatCompletion } from '../util/llm';
import * as memory from './memory';
import { api, internal } from '../_generated/api';
import * as embeddingsCache from './embeddingsCache';
import { GameId, conversationId, playerId } from '../aiTown/ids';
import { NUM_MEMORIES_TO_SEARCH } from '../constants';
import { EVENT_EFFECTS, EVENT_PROMPT_HINTS } from '../psychConfig';
import { buildAgentPrompt, StateNow } from '../prompts/agent';
import { toSimTime } from '../engine/simTime';

const selfInternal = internal.agent.conversation;

async function buildStateNow(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  agentIdStr: string,
  placeSeed?: string,
): Promise<StateNow> {
  const snapshot = await ctx.runQuery(selfInternal.queryStateSnapshot, {
    worldId,
    agentId: agentIdStr,
  });
  const nowReal = Date.now();
  const simTime = toSimTime(snapshot.worldBootMs, nowReal);

  const baseMood = snapshot.state?.emotion as
    | { stress?: number; anxiety?: number; joy?: number }
    | undefined;
  const moodSource = {
    stress: baseMood?.stress ?? 0.3,
    anxiety: baseMood?.anxiety ?? 0.3,
    joy: baseMood?.joy ?? 0.5,
  };

  const events = snapshot.events as Doc<'events'>[];
  const personalEvents = events
    .filter((e) => e.target === 'class' || e.agentId === agentIdStr)
    .slice(0, 5)
    .map((e) => ({
      type: e.type,
      strength: e.intensity,
      note: EVENT_PROMPT_HINTS[e.type]?.summary,
    }));

  const lifeSeeds = [
    '今天天气有点闷热，班里都在抱怨风扇不给力',
    '食堂新品是排骨饭，大家排队排到走廊',
    '晚自习前操场在放社团音乐，挺吵但也热闹',
    '宿舍有人带了奶茶回来，味道充满走廊',
    '隔壁班又在讨论动漫新番，你隐约听到了剧透',
    '手机推送告诉你喜欢的乐队要开线上演唱会',
  ];
  const exam = snapshot.exam;

  return {
    simTime: `${simTime.toLocaleDateString()} ${simTime.toLocaleTimeString()}`,
    place: placeSeed ?? '教室',
    mood: {
      stress: moodSource.stress,
      anxiety: moodSource.anxiety,
      joy: moodSource.joy,
    },
    recentEvents: personalEvents,
    lastExam: exam ?? undefined,
    lifeSeed: lifeSeeds[Math.floor(Math.random() * lifeSeeds.length)],
  };
}

export async function startConversationMessage(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  conversationId: GameId<'conversations'>,
  playerId: GameId<'players'>,
  otherPlayerId: GameId<'players'>,
): Promise<string> {
  const { player, otherPlayer, agent, otherAgent, lastConversation } = await ctx.runQuery(
    selfInternal.queryPromptData,
    {
      worldId,
      playerId,
      otherPlayerId,
      conversationId,
    },
  );
  const embedding = await embeddingsCache.fetch(
    ctx,
    `${player.name} is talking to ${otherPlayer.name}`,
  );

  const memories = await memory.searchMemories(
    ctx,
    player.id as GameId<'players'>,
    embedding,
    Number(process.env.NUM_MEMORIES_TO_SEARCH) || NUM_MEMORIES_TO_SEARCH,
  );

  const memoryWithOtherPlayer = memories.find(
    (m: memory.Memory) => m.data.type === 'conversation' && (m.data as any).playerIds.includes(otherPlayerId),
  );
  const stateNow = await buildStateNow(ctx, worldId, agent.id as string);
  const memoryBrief = summarizeMemories(memories);
  const promptPack = buildAgentPrompt(player.name, stateNow, memoryBrief);
  const otherSummary = otherAgent
    ? `对话对象：${otherPlayer.name}（${otherAgent.identity}）。`
    : `对话对象：${otherPlayer.name}。`;
  const historyHints: string[] = [];
  if (memoryWithOtherPlayer) {
    historyHints.push('上次你们聊过共同话题，可以自然提及或追问进展。');
  }
  if (lastConversation) {
    historyHints.push(
      `上次聊天结束于 ${new Date(lastConversation.created).toLocaleString()}，可以从当时的安排接上。`,
    );
  }
  const intro: LLMMessage[] = [
    { role: 'system', content: promptPack.system },
    {
      role: 'user',
      content: [promptPack.user, otherSummary, historyHints.join('\n')]
        .filter(Boolean)
        .join('\n\n'),
    },
  ];
  intro.push({
    role: 'user',
    content: [...safetyInstructions(), `${player.name}要先接住对方情绪，再自然展开生活话题。`].join('\n'),
  });
  const lastPrompt = `${player.name} to ${otherPlayer.name}:`;
  const { content } = await chatCompletion({
    messages: [...intro, { role: 'user', content: lastPrompt }],
    max_tokens: 220,
    temperature: 0.95,
    top_p: 0.95,
    stop: stopWords(otherPlayer.name, player.name),
  });
  return sanitizeOutput(trimContentPrefx(content, lastPrompt));
}

function trimContentPrefx(content: string, prompt: string) {
  if (content.startsWith(prompt)) {
    return content.slice(prompt.length).trim();
  }
  return content;
}

export async function continueConversationMessage(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  conversationId: GameId<'conversations'>,
  playerId: GameId<'players'>,
  otherPlayerId: GameId<'players'>,
): Promise<string> {
  const { player, otherPlayer, conversation, agent, otherAgent } = await ctx.runQuery(
    selfInternal.queryPromptData,
    {
      worldId,
      playerId,
      otherPlayerId,
      conversationId,
    },
  );
  const now = Date.now();
  const started = new Date(conversation.created);
  const embedding = await embeddingsCache.fetch(
    ctx,
    `What do you think about ${otherPlayer.name}?`,
  );
  const memories = await memory.searchMemories(
    ctx,
    player.id as GameId<'players'>,
    embedding,
    Number(process.env.NUM_MEMORIES_TO_SEARCH) || NUM_MEMORIES_TO_SEARCH,
  );
  const stateNow = await buildStateNow(ctx, worldId, agent.id as string);
  const memoryBrief = summarizeMemories(memories);
  const promptPack = buildAgentPrompt(player.name, stateNow, memoryBrief);
  const contextLines = [
    `当前时间：${new Date(now).toLocaleString()}，本轮对话开始于 ${started.toLocaleString()}.`,
    otherAgent ? `对方简介：${otherPlayer.name}（${otherAgent.identity}）。` : '',
  ].filter(Boolean);

  const historyMessages = await previousMessages(
    ctx,
    worldId,
    player,
    otherPlayer,
    conversation.id as GameId<'conversations'>,
  );

  const llmMessages: LLMMessage[] = [
    { role: 'system', content: promptPack.system },
    { role: 'user', content: [promptPack.user, ...contextLines].join('\n\n') },
    ...historyMessages,
    {
      role: 'user',
      content: [...safetyInstructions(), '不要重新打招呼，自然延续对话，可顺势聊些生活琐事。'].join('\n'),
    },
  ];
  const lastPrompt = `${player.name} to ${otherPlayer.name}:`;
  llmMessages.push({ role: 'user', content: lastPrompt });

  const { content } = await chatCompletion({
    messages: llmMessages,
    max_tokens: 220,
    temperature: 0.95,
    top_p: 0.95,
    stop: stopWords(otherPlayer.name, player.name),
  });
  return sanitizeOutput(trimContentPrefx(content, lastPrompt));
}

export async function leaveConversationMessage(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  conversationId: GameId<'conversations'>,
  playerId: GameId<'players'>,
  otherPlayerId: GameId<'players'>,
): Promise<string> {
  const { player, otherPlayer, conversation, agent, otherAgent } = await ctx.runQuery(
    selfInternal.queryPromptData,
    {
      worldId,
      playerId,
      otherPlayerId,
      conversationId,
    },
  );
  const stateNow = await buildStateNow(ctx, worldId, agent.id as string);
  const promptPack = buildAgentPrompt(player.name, stateNow, '');
  const llmMessages: LLMMessage[] = [
    { role: 'system', content: promptPack.system },
    {
      role: 'user',
      content: [
        promptPack.user,
        '你准备结束这段对话，请真诚说明要离开，可以提到去上课、去饭堂或补作业等理由。',
      ].join('\n\n'),
    },
    ...(await previousMessages(
      ctx,
      worldId,
      player,
      otherPlayer,
      conversation.id as GameId<'conversations'>,
    )),
    {
      role: 'user',
      content: [...safetyInstructions(), '保持一句或两句，友好结束。'].join('\n'),
    },
  ];
  const lastPrompt = `${player.name} to ${otherPlayer.name}:`;
  llmMessages.push({ role: 'user', content: lastPrompt });

  const { content } = await chatCompletion({
    messages: llmMessages,
    max_tokens: 200,
    temperature: 0.9,
    top_p: 0.9,
    stop: stopWords(otherPlayer.name, player.name),
  });
  return sanitizeOutput(trimContentPrefx(content, lastPrompt));
}

function safetyInstructions(): string[] {
  return [
    '安全规则：',
    '- 不要输出人名标签或“X to Y:”前缀；',
    '- 不要输出代码块/JSON；',
    '- 不要输出任何“思考/推理/分析/chain-of-thought”，尤其不要输出包含 <think>…</think> 的内容；',
    '- 仅输出你最终的一段自然语言回复，保持简短。',
  ];
}

function previousConversationPrompt(
  otherPlayer: { name: string },
  conversation: { created: number } | null,
): string[] {
  const prompt = [];
  if (conversation) {
    const prev = new Date(conversation.created);
    const now = new Date();
    prompt.push(
      `Last time you chatted with ${
        otherPlayer.name
      } it was ${prev.toLocaleString()}. It's now ${now.toLocaleString()}.`,
    );
  }
  return prompt;
}

function relatedMemoriesPrompt(memories: memory.Memory[]): string[] {
  const prompt = [];
  if (memories.length > 0) {
    prompt.push(`Here are some related memories in decreasing relevance order:`);
    for (const memory of memories) {
      prompt.push(' - ' + memory.description);
    }
  }
  return prompt;
}

function summarizeMemories(memories: memory.Memory[], limit = 3): string {
  if (!memories.length) return '';
  return memories
    .slice(0, limit)
    .map((m) => m.description.replace(/^ -\s*/, ''))
    .join('；');
}

async function previousMessages(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  player: { id: string; name: string },
  otherPlayer: { id: string; name: string },
  conversationId: GameId<'conversations'>,
) {
  const llmMessages: LLMMessage[] = [];
  const prevMessages = await ctx.runQuery(api.messages.listMessages, { worldId, conversationId });
  for (const message of prevMessages) {
    const author = message.author === player.id ? player : otherPlayer;
    const recipient = message.author === player.id ? otherPlayer : player;
    llmMessages.push({
      role: 'user',
      content: `${author.name} to ${recipient.name}: ${message.text}`,
    });
  }
  return llmMessages;
}

export const queryPromptData = internalQuery({
  args: {
    worldId: v.id('worlds'),
    playerId,
    otherPlayerId: playerId,
    conversationId,
  },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) {
      throw new Error(`World ${args.worldId} not found`);
    }
    const player = world.players.find((p) => p.id === args.playerId);
    if (!player) {
      throw new Error(`Player ${args.playerId} not found`);
    }
    const playerDescription = await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('playerId', args.playerId))
      .first();
    if (!playerDescription) {
      throw new Error(`Player description for ${args.playerId} not found`);
    }
    const otherPlayer = world.players.find((p) => p.id === args.otherPlayerId);
    if (!otherPlayer) {
      throw new Error(`Player ${args.otherPlayerId} not found`);
    }
    const otherPlayerDescription = await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('playerId', args.otherPlayerId))
      .first();
    if (!otherPlayerDescription) {
      throw new Error(`Player description for ${args.otherPlayerId} not found`);
    }
    const conversation = world.conversations.find((c) => c.id === args.conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${args.conversationId} not found`);
    }
    const agent = world.agents.find((a) => a.playerId === args.playerId);
    if (!agent) {
      throw new Error(`Player ${args.playerId} not found`);
    }
    const agentDescription = await ctx.db
      .query('agentDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('agentId', agent.id))
      .first();
    if (!agentDescription) {
      throw new Error(`Agent description for ${agent.id} not found`);
    }
    const otherAgent = world.agents.find((a) => a.playerId === args.otherPlayerId);
    let otherAgentDescription;
    if (otherAgent) {
      otherAgentDescription = await ctx.db
        .query('agentDescriptions')
        .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('agentId', otherAgent.id))
        .first();
      if (!otherAgentDescription) {
        throw new Error(`Agent description for ${otherAgent.id} not found`);
      }
    }
    const lastTogether = await ctx.db
      .query('participatedTogether')
      .withIndex('edge', (q) =>
        q
          .eq('worldId', args.worldId)
          .eq('player1', args.playerId)
          .eq('player2', args.otherPlayerId),
      )
      // Order by conversation end time descending.
      .order('desc')
      .first();

    let lastConversation = null;
    if (lastTogether) {
      lastConversation = await ctx.db
        .query('archivedConversations')
        .withIndex('worldId', (q) =>
          q.eq('worldId', args.worldId).eq('id', lastTogether.conversationId),
        )
        .first();
      if (!lastConversation) {
        throw new Error(`Conversation ${lastTogether.conversationId} not found`);
      }
    }
    return {
      player: { name: playerDescription.name, ...player },
      otherPlayer: { name: otherPlayerDescription.name, ...otherPlayer },
      conversation,
      agent: {
        identity: agentDescription.identity,
        plan: agentDescription.plan,
        gender: (agentDescription.gender as '男' | '女') ?? '男',
        subjectTag: agentDescription.subjectTag ?? '综合',
        verbalTics: agentDescription.verbalTics ?? [],
        examples: agentDescription.examples ?? [],
        ...agent,
      },
      otherAgent:
        otherAgent && {
          identity: otherAgentDescription!.identity,
          plan: otherAgentDescription!.plan,
          gender: (otherAgentDescription!.gender as '男' | '女') ?? '男',
          subjectTag: otherAgentDescription!.subjectTag ?? '综合',
          verbalTics: otherAgentDescription!.verbalTics ?? [],
          examples: otherAgentDescription!.examples ?? [],
          ...otherAgent,
        },
      lastConversation,
    };
  },
});

export const queryStateSnapshot = internalQuery({
  args: {
    worldId: v.id('worlds'),
    agentId: v.string(),
  },
  handler: async (ctx, { worldId, agentId }) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .withIndex('worldId', (q) => q.eq('worldId', worldId))
      .first();
    const state = await ctx.db
      .query('psychStates')
      .withIndex('byAgent', (q) => q.eq('worldId', worldId).eq('agentId', agentId))
      .first();
    const now = Date.now();
    const events = await ctx.db
      .query('events')
      .withIndex('byWorldTime', (q) => q.eq('worldId', worldId))
      .filter((q) => q.gte(q.field('start'), now - 24 * 3600 * 1000))
      .order('desc')
      .take(200);
    const exams = await ctx.db
      .query('exams')
      .withIndex('byWorldTs', (q) => q.eq('worldId', worldId))
      .order('desc')
      .take(10);
    const examEntry = exams
      .map((row) => ({
        name: row.name,
        score: row.scores.find((s) => s.agentId === agentId)?.score,
      }))
      .find((x) => x.score != null);
    return {
      worldBootMs: (worldStatus as any)?.worldBootMs ?? null,
      state,
      events,
      exam: examEntry ?? null,
    };
  },
});

function stopWords(otherPlayer: string, player: string) {
  // These are the words we ask the LLM to stop on. OpenAI only supports 4.
  const variants = [`${otherPlayer} to ${player}`];
  return variants.flatMap((stop) => [stop + ':', stop.toLowerCase() + ':']);
}

// 输出清洗：去除<think>…</think>、代码块/JSON、冗长前言，截断长度
function sanitizeOutput(raw: string): string {
  let t = raw ?? '';
  // 去除姓名或多余前缀 "X: "
  t = t.replace(/^\s*([\p{L}\w]+)\s*[:：]\s*/u, '');
  // 去除 <think>…</think> 或仅有开标签的内容（直到空行或结尾）
  t = t.replace(/<think>[\s\S]*?(<\/think>|\n\n|$)/gi, '');
  // 去除“思考/分析/推理：”段落（直到空行）
  t = t.replace(/^(思考|分析|推理|Chain[- ]?of[- ]?thought|Reasoning)[:：][\s\S]*?(\n\n|$)/i, '');
  // 去除代码块与内联反引号
  t = t.replace(/```[\s\S]*?```/g, '');
  t = t.replace(/`{1,3}[^`]*`{1,3}/g, '');
  // 粗暴移除巨大 JSON 块
  if (/\{[\s\S]{20,}\}/.test(t)) t = t.replace(/\{[\s\S]*\}/g, '');
  // 空白规整
  t = t.replace(/[ \t\u3000]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
  // 长度截断（中文 140 左右）
  const MAX_LEN = 140;
  if (t.length > MAX_LEN) {
    const cut = t.slice(0, MAX_LEN + 1);
    const lastPunc = Math.max(
      cut.lastIndexOf('。'),
      cut.lastIndexOf('！'),
      cut.lastIndexOf('？'),
      cut.lastIndexOf('~'),
      cut.lastIndexOf('!'),
      cut.lastIndexOf('?'),
      cut.lastIndexOf('.')
    );
    t = (lastPunc > 20 ? cut.slice(0, lastPunc + 1) : cut.slice(0, MAX_LEN)).trim();
  }
  if (!t) t = '嗯。';
  return t;
}
