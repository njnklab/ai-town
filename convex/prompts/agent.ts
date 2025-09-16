import { GLOBAL_SYSTEM, CONVERSATION_STYLE, PERSONA_BASE } from './global';

export type StateNow = {
  simTime: string;
  place: string;
  mood: { stress: number; anxiety: number; joy: number };
  recentEvents: Array<{ type: string; strength: number; note?: string }>;
  lastExam?: { name?: string; score?: number } | null;
  lifeSeed?: string;
};

function pct(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export function buildSceneCard(state: StateNow) {
  const events = state.recentEvents.length
    ? state.recentEvents
        .map((e) => `${e.type}${typeof e.strength === 'number' ? `(${Math.round(e.strength * 100)}%)` : ''}${
            e.note ? `：${e.note}` : ''
          }`)
        .join('、')
    : '无';
  const mood = `压力 ${pct(state.mood.stress)}，焦虑 ${pct(state.mood.anxiety)}，愉悦 ${pct(
    state.mood.joy,
  )}`;
  const lastExam = state.lastExam?.score != null
    ? `最近成绩：${state.lastExam.name ?? '模拟考'} ${state.lastExam.score} 分。`
    : '';
  const lifeSeed = state.lifeSeed ? `校园日常：${state.lifeSeed}` : '';
  return `场景信息：
- 时间：${state.simTime}
- 地点：${state.place}
- 当前感受：${mood}
- 最近事件：${events}
${lastExam}
${lifeSeed}`.trim();
}

export function buildAgentPrompt(name: string, state: StateNow, memoryBrief: string) {
  const persona = PERSONA_BASE[name] ?? '普通高中生';
  const sceneCard = buildSceneCard(state);
  const briefs = [
    `你的角色：${name}。人格简介：${persona}`,
    sceneCard,
    memoryBrief ? `记忆提要：${memoryBrief}` : '',
    CONVERSATION_STYLE,
    '输出：用自然中文，最多 2~3 句，可附一个轻量追问。',
  ]
    .filter(Boolean)
    .join('\n\n');
  return {
    system: GLOBAL_SYSTEM,
    user: briefs,
  };
}
