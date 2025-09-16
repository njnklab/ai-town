import { applyEvent } from '@/engine/appraisal';
import { agentBase, ctxBase } from '@/engine/testUtils/fixtures';
import { WorldEvent } from '@/types/event';

test('quiz_low_score increases stress and reduces joy', () => {
  const a = agentBase();
  const e: WorldEvent = {
    id: 'e1',
    kind: 'quiz_low_score',
    time: 0,
    actors: ['a1'],
    intensity: 0.8,
  };
  const b = applyEvent(a, e, ctxBase);
  expect(b.stress).toBeGreaterThan(a.stress);
  expect(b.emotion.joy).toBeLessThanOrEqual(a.emotion.joy);
});

test('peer_support reduces stress and increases joy', () => {
  const a = agentBase();
  const e: WorldEvent = {
    id: 'e2',
    kind: 'peer_support',
    time: 0,
    actors: ['a1', 'a2'],
    intensity: 0.6,
  };
  const b = applyEvent(a, e, ctxBase);
  expect(b.stress).toBeLessThanOrEqual(a.stress);
  expect(b.emotion.joy).toBeGreaterThanOrEqual(a.emotion.joy);
});
