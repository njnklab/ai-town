import { ObjectType, v } from 'convex/values';
import { GameId, agentId, parseGameId } from './ids';

export class AgentDescription {
  agentId: GameId<'agents'>;
  identity: string;
  plan: string;
  gender: '男' | '女';
  subjectTag: string;
  verbalTics: string[];
  examples: string[];

  constructor(serialized: SerializedAgentDescription) {
    const {
      agentId,
      identity,
      plan,
      gender = '男',
      subjectTag = '综合',
      verbalTics = [],
      examples = [],
    } = serialized;
    this.agentId = parseGameId('agents', agentId);
    this.identity = identity;
    this.plan = plan;
    this.gender = gender as '男' | '女';
    this.subjectTag = subjectTag;
    this.verbalTics = verbalTics;
    this.examples = examples;
  }

  serialize(): SerializedAgentDescription {
    const { agentId, identity, plan, gender, subjectTag, verbalTics, examples } = this;
    return { agentId, identity, plan, gender, subjectTag, verbalTics, examples };
  }
}

export const serializedAgentDescription = {
  agentId,
  identity: v.string(),
  plan: v.string(),
  gender: v.optional(v.union(v.literal('男'), v.literal('女'))),
  subjectTag: v.optional(v.string()),
  verbalTics: v.optional(v.array(v.string())),
  examples: v.optional(v.array(v.string())),
};
export type SerializedAgentDescription = ObjectType<typeof serializedAgentDescription>;
