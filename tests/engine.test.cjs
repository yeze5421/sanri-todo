'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');
const NOW = 1800000000000;

function withTasks(tasks) {
  return { ...E.createState(), tasks };
}

function deepFreeze(value) {
  Object.freeze(value);
  Object.values(value).forEach(child => {
    if (child && typeof child === 'object' && !Object.isFrozen(child)) deepFreeze(child);
  });
  return value;
}

test('an item lives for exactly 72 hours, with clear day boundaries', () => {
  const task = E.createTask('散个步', NOW, 'walk');
  assert.equal(E.getTaskLife(task, NOW).stage, 'fresh');
  assert.equal(E.getTaskLife(task, NOW + E.HOUR * 24 - 1).stage, 'fresh');
  assert.equal(E.getTaskLife(task, NOW + E.HOUR * 24).stage, 'fading');
  assert.equal(E.getTaskLife(task, NOW + E.HOUR * 48).stage, 'leaving');
  assert.equal(E.sweepExpired(withTasks([task]), NOW + E.TTL - 1).expiredCount, 0);
  const expiry = E.sweepExpired(withTasks([task]), NOW + E.TTL);
  assert.equal(expiry.expiredCount, 1);
  assert.deepEqual(expiry.state.tasks, []);
  assert.equal(expiry.state.stats.released, 1);
  assert.equal(E.getTaskLife(task, NOW + E.TTL).stage, 'expired');
});

test('reopening after days offline removes expired text and counts it only once', () => {
  const state = withTasks([
    E.createTask('早已过期的事', NOW - E.TTL * 3, 'old'),
    E.createTask('仍然新鲜的事', NOW - E.HOUR, 'new')
  ]);
  const saved = JSON.parse(JSON.stringify(state));
  const loaded = E.normalizeState(saved, NOW);
  const first = E.sweepExpired(loaded, NOW);
  const second = E.sweepExpired(first.state, NOW + E.HOUR);
  assert.equal(first.expiredCount, 1);
  assert.equal(second.expiredCount, 0);
  assert.equal(second.state.stats.released, 1);
  assert.deepEqual(second.state.tasks.map(task => task.id), ['new']);
  assert.equal(JSON.stringify(second.state).includes('早已过期'), false);
});

test('completed tasks remain after their original deadline and cannot complete twice', () => {
  const initial = withTasks([E.createTask('读一本书', NOW, 'book')]);
  const completed = E.completeTask(initial, 'book', NOW + E.HOUR);
  assert.equal(completed.tasks[0].completedAt, NOW + E.HOUR);
  assert.equal(completed.stats.completed, 1);
  assert.equal(E.completeTask(completed, 'book', NOW + 2 * E.HOUR), completed);
  const swept = E.sweepExpired(completed, NOW + E.TTL * 5);
  assert.equal(swept.expiredCount, 0);
  assert.equal(swept.state.tasks.length, 1);
  assert.equal(E.releaseTask(completed, 'book', NOW + E.HOUR), completed);
});

test('expiration cannot be defeated by completion or undo at the boundary', () => {
  const task = E.createTask('旧的待办', NOW, 'old');
  const state = withTasks([task]);
  assert.equal(E.completeTask(state, 'old', NOW + E.TTL), state);
  const completed = E.completeTask(state, 'old', NOW + E.HOUR);
  assert.equal(E.undoCompletion(completed, 'old', NOW + E.TTL), completed);
  const released = E.releaseTask(state, 'old', NOW + E.HOUR);
  assert.equal(E.restoreReleasedTask(released, task, NOW + E.TTL), released);
});

test('undo restores the original deadline and adjusts counters', () => {
  const task = E.createTask('小事', NOW, 'small');
  const initial = withTasks([task]);
  const completed = E.completeTask(initial, 'small', NOW + 10);
  const undone = E.undoCompletion(completed, 'small', NOW + 20);
  assert.equal(undone.tasks[0].createdAt, NOW);
  assert.equal(undone.tasks[0].completedAt, null);
  assert.equal(undone.stats.completed, 0);
  const released = E.releaseTask(initial, 'small', NOW + 10);
  assert.equal(released.stats.released, 1);
  const restored = E.restoreReleasedTask(released, task, NOW + 20);
  assert.equal(restored.tasks[0].createdAt, NOW);
  assert.equal(restored.stats.released, 0);
  assert.equal(E.restoreReleasedTask(restored, task, NOW + 30), restored);
});

test('invalid, duplicate, oversized and malformed persisted records are rejected safely', () => {
  for (const raw of [null, false, '', 12, {}, { version: 9, tasks: [] }, { version: 1, tasks: {} }]) {
    assert.deepEqual(E.normalizeState(raw, NOW), E.createState());
  }
  const task = E.createTask('  有效待办  ', NOW, 'valid');
  const normalized = E.normalizeState({ version: 1, tasks: [
    task, { ...task, text: '重复 ID' }, null, {}, { ...task, id: 'blank', text: ' ' },
    { ...task, id: 'long', text: 'x'.repeat(121) }, { ...task, id: 'time', createdAt: 'yesterday' },
    { ...task, id: 'negative', createdAt: -1 }, { ...task, id: 'bad-done', completedAt: NOW - 1 },
    { ...task, id: 'done', completedAt: NOW }
  ], stats: { released: -12, completed: NaN } }, NOW);
  assert.equal(normalized.tasks.length, 2);
  assert.equal(normalized.tasks[0].text, '有效待办');
  assert.equal(normalized.stats.released, 0);
  assert.equal(normalized.stats.completed, 1);
});

test('task creation rejects empty input, excessive length and invalid timestamps', () => {
  assert.throws(() => E.createTask(' \n ', NOW), RangeError);
  assert.throws(() => E.createTask('a'.repeat(121), NOW), RangeError);
  assert.throws(() => E.createTask(null, NOW), TypeError);
  assert.throws(() => E.createTask('a', Infinity), RangeError);
  assert.throws(() => E.createTask('a', -1), RangeError);
  assert.throws(() => E.createTask('a', NOW, ''), RangeError);
  assert.equal(E.createTask('a'.repeat(120), NOW).text.length, 120);
});

test('all transitions preserve frozen input state', () => {
  const initial = deepFreeze(withTasks([E.createTask('原始任务', NOW, 'original')]));
  const added = E.addTask(initial, '新任务', NOW + 1);
  const completed = E.completeTask(initial, 'original', NOW + 1);
  const released = E.releaseTask(initial, 'original', NOW + 1);
  const expired = E.sweepExpired(initial, NOW + E.TTL);
  const normalized = E.normalizeState(initial, NOW);
  assert.equal(initial.tasks.length, 1);
  assert.equal(initial.tasks[0].completedAt, null);
  assert.deepEqual(initial.stats, { completed: 0, released: 0 });
  assert.equal(added.tasks.length, 2);
  assert.equal(completed.stats.completed, 1);
  assert.equal(released.tasks.length, 0);
  assert.equal(expired.state.tasks.length, 0);
  assert.notEqual(normalized.tasks[0], initial.tasks[0]);
});

test('opacity fades continuously and stays bounded when clocks move', () => {
  const task = E.createTask('光', NOW, 'light');
  let previous = 1;
  for (let hour = 0; hour <= 100; hour++) {
    const life = E.getTaskLife(task, NOW + hour * E.HOUR);
    assert.ok(life.opacity <= previous);
    assert.ok(life.opacity >= 0.42 && life.opacity <= 1);
    assert.ok(life.remaining >= 0 && life.remaining <= E.TTL);
    previous = life.opacity;
  }
  const beforeCreation = E.getTaskLife(task, NOW - E.HOUR);
  assert.equal(beforeCreation.age, 0);
  assert.equal(beforeCreation.remaining, E.TTL);
  assert.equal(beforeCreation.opacity, 1);
});

test('future persisted timestamps are bounded to now without reviving expired records', () => {
  const state = withTasks([
    E.createTask('未来', NOW + E.HOUR, 'future'),
    E.createTask('过去', NOW - E.TTL, 'past')
  ]);
  const normalized = E.normalizeState(state, NOW);
  assert.equal(normalized.tasks[0].createdAt, NOW);
  assert.equal(E.sweepExpired(normalized, NOW).expiredCount, 1);
});
