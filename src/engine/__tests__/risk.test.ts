import { computeRisk } from '@/engine/risk';
import { agentBase, ctxBase } from '@/engine/testUtils/fixtures';

test('risk increases with stress and negative emotions, decreases with joy/support', () => {
  const a = agentBase();
  a.stress = 0.8;
  a.emotion.anxiety = 0.7;
  a.emotion.sadness = 0.5;
  a.emotion.joy = 0.1;
  a.ties = [{ targetId: 'friend', weight: 0.8 }];
  const r = computeRisk(a, ctxBase);
  expect(r).toBeGreaterThan(0.5);
});
