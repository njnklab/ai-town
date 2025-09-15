import { decayState } from '@/engine/decay';
import { agentBase } from '@/engine/testUtils/fixtures';

test('decay reduces magnitude of emotions and stress, increases energy', () => {
  const a = agentBase();
  a.emotion = { joy: 0.6, anxiety: 0.4, sadness: -0.3, anger: 0.2 };
  a.stress = 0.7;
  a.energy = 0.3;
  const b = decayState(a, 2); // 2小时
  expect(Math.abs(b.emotion.joy)).toBeLessThan(Math.abs(a.emotion.joy));
  expect(b.stress).toBeLessThan(a.stress);
  expect(b.energy).toBeGreaterThan(a.energy);
});
