import { spreadEmotion } from '@/engine/social';
import { agentBase } from '@/engine/testUtils/fixtures';

test('spreadEmotion changes emotion based on neighbors and ties', () => {
  const a = agentBase('a1');
  const b = agentBase('a2');
  b.emotion.joy = 0.8;
  const c = agentBase('a3');
  c.emotion.anxiety = 0.7;
  const aWithTies = { ...a, ties: [{ targetId: 'a2', weight: 0.6 }, { targetId: 'a3', weight: 0.4 }] };
  const next = spreadEmotion(aWithTies, [b, c], 1);
  expect(next.emotion.joy).not.toBe(a.emotion.joy);
  expect(next.emotion.anxiety).not.toBe(a.emotion.anxiety);
});
