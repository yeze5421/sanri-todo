(function (root, factory) {
  'use strict';
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  else root.SanriEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const HOUR = 60 * 60 * 1000;
  const TTL = 72 * HOUR;
  const MAX_TEXT_LENGTH = 120;

  function timestamp(value) {
    const result = value === undefined ? Date.now() : value;
    if (!Number.isFinite(result) || result < 0) throw new RangeError('时间必须是有效的时间戳');
    return result;
  }

  function createState() {
    return { version: 1, tasks: [], stats: { completed: 0, released: 0 } };
  }

  function safeCount(value) {
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }

  function validId(value) {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= 128;
  }

  function normalizeTask(raw, now) {
    if (!raw || typeof raw !== 'object' || !validId(raw.id)) return null;
    if (typeof raw.text !== 'string') return null;
    const text = raw.text.trim();
    if (!text || text.length > MAX_TEXT_LENGTH) return null;
    if (!Number.isFinite(raw.createdAt) || raw.createdAt < 0) return null;
    const createdAt = Math.min(raw.createdAt, now);
    let completedAt = null;
    if (raw.completedAt !== null && raw.completedAt !== undefined) {
      if (!Number.isFinite(raw.completedAt) || raw.completedAt < raw.createdAt) return null;
      completedAt = Math.min(raw.completedAt, now);
    }
    return { id: raw.id, text, createdAt, completedAt };
  }

  // Validation and expiration are separate so callers can announce expired items once.
  function normalizeState(raw, now) {
    now = timestamp(now);
    if (!raw || typeof raw !== 'object' || raw.version !== 1 || !Array.isArray(raw.tasks)) {
      return createState();
    }
    const seen = new Set();
    const tasks = [];
    for (const item of raw.tasks) {
      const task = normalizeTask(item, now);
      if (task && !seen.has(task.id)) {
        seen.add(task.id);
        tasks.push(task);
      }
    }
    return {
      version: 1,
      tasks,
      stats: {
        completed: Math.max(safeCount(raw.stats && raw.stats.completed), tasks.filter(task => task.completedAt !== null).length),
        released: safeCount(raw.stats && raw.stats.released)
      }
    };
  }

  function createTask(text, now, optionalId) {
    now = timestamp(now);
    if (typeof text !== 'string') throw new TypeError('写下一件小事吧');
    text = text.trim();
    if (!text) throw new RangeError('写下一件小事吧');
    if (text.length > MAX_TEXT_LENGTH) throw new RangeError('每件小事最多写 120 个字符');
    let id = optionalId;
    if (id === undefined) {
      id = typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : 'task-' + now.toString(36) + '-' + Math.random().toString(36).slice(2);
    }
    if (!validId(id)) throw new RangeError('待办标识无效');
    return { id, text, createdAt: now, completedAt: null };
  }

  function addTask(state, text, now) {
    const task = createTask(text, now);
    return { ...state, tasks: [task, ...state.tasks] };
  }

  function getTaskLife(task, now) {
    now = timestamp(now);
    const age = Math.max(0, now - task.createdAt);
    const remaining = Math.max(0, TTL - age);
    const progress = Math.min(1, age / TTL);
    const stage = age >= TTL ? 'expired' : age >= 48 * HOUR ? 'leaving' : age >= 24 * HOUR ? 'fading' : 'fresh';
    return { age, remaining, progress, opacity: 1 - 0.58 * progress, stage };
  }

  function completeTask(state, id, now) {
    now = timestamp(now);
    const task = state.tasks.find(item => item.id === id);
    if (!task || task.completedAt !== null || getTaskLife(task, now).remaining === 0) return state;
    return {
      ...state,
      tasks: state.tasks.map(item => item.id === id ? { ...item, completedAt: now } : item),
      stats: { ...state.stats, completed: state.stats.completed + 1 }
    };
  }

  function releaseTask(state, id, now) {
    timestamp(now);
    const task = state.tasks.find(item => item.id === id);
    if (!task || task.completedAt !== null) return state;
    return {
      ...state,
      tasks: state.tasks.filter(item => item.id !== id),
      stats: { ...state.stats, released: state.stats.released + 1 }
    };
  }

  function sweepExpired(state, now) {
    now = timestamp(now);
    const tasks = state.tasks.filter(task => task.completedAt !== null || getTaskLife(task, now).remaining > 0);
    const expiredCount = state.tasks.length - tasks.length;
    return {
      state: expiredCount === 0 ? state : {
        ...state,
        tasks,
        stats: { ...state.stats, released: state.stats.released + expiredCount }
      },
      expiredCount
    };
  }

  // Undo preserves the original deadline; it never grants another three days.
  function undoCompletion(state, id, now) {
    now = timestamp(now);
    const task = state.tasks.find(item => item.id === id);
    if (!task || task.completedAt === null || getTaskLife(task, now).remaining === 0) return state;
    return {
      ...state,
      tasks: state.tasks.map(item => item.id === id ? { ...item, completedAt: null } : item),
      stats: { ...state.stats, completed: Math.max(0, state.stats.completed - 1) }
    };
  }

  function restoreReleasedTask(state, task, now) {
    now = timestamp(now);
    const restored = normalizeTask(task, now);
    if (!restored || restored.completedAt !== null || getTaskLife(restored, now).remaining === 0 || state.tasks.some(item => item.id === restored.id)) return state;
    return {
      ...state,
      tasks: [restored, ...state.tasks].sort((a, b) => b.createdAt - a.createdAt),
      stats: { ...state.stats, released: Math.max(0, state.stats.released - 1) }
    };
  }

  return Object.freeze({
    HOUR, TTL, MAX_TEXT_LENGTH, createState, normalizeState, createTask, addTask,
    completeTask, releaseTask, sweepExpired, getTaskLife, undoCompletion, restoreReleasedTask
  });
});
