export type EventKind =
  | 'quiz_low_score'
  | 'quiz_high_score'
  | 'teacher_praise'
  | 'peer_conflict'
  | 'peer_support'
  | 'parent_pressure'
  | 'extra_homework'
  | 'mock_exam'
  | 'self_reflection'
  | 'club_activity';

export interface WorldEvent {
  id: string;
  kind: EventKind;
  time: number; // 模拟时间
  actors: string[]; // 参与 agent id
  payload?: Record<string, any>; // 分数、强度等
  location?: string; // 教室/操场/食堂/家
  intensity: number; // 0..1
}

