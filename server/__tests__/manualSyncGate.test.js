const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createManualSyncGate } = require('../services/analytics/manualSyncGate');

test('защита не допускает параллельную ручную сверку одной сети', () => {
  const gate = createManualSyncGate(60_000);
  const first = gate.acquire(['network-1'], 1_000);
  const second = gate.acquire(['network-1'], 2_000);

  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.status, 409);
});

test('защита выдерживает паузу между повторными сверками', () => {
  const gate = createManualSyncGate(60_000);
  const first = gate.acquire(['network-1'], 1_000);
  gate.release(first.networkIds);

  const early = gate.acquire(['network-1'], 31_000);
  const ready = gate.acquire(['network-1'], 61_000);

  assert.equal(early.ok, false);
  assert.equal(early.status, 429);
  assert.equal(early.retryAfterSeconds, 30);
  assert.equal(ready.ok, true);
});

test('сверки разных сетей не блокируют друг друга', () => {
  const gate = createManualSyncGate(60_000);

  assert.equal(gate.acquire(['network-1'], 1_000).ok, true);
  assert.equal(gate.acquire(['network-2'], 1_000).ok, true);
});
