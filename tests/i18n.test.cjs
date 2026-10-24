const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'i18n.js'), 'utf8');

function loadI18n(localStorage) {
  const context = { module: { exports: {} }, localStorage };
  vm.runInNewContext(source, context, { filename: 'i18n.js' });
  return context.module.exports;
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  const writes = [];
  return {
    values, writes,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { writes.push([key, value]); values.set(key, String(value)); }
  };
}

test('language preferences persist independently without rewriting task data or deadlines', () => {
  const originalTasks = JSON.stringify({ started: true, state: {
    version: 1,
    tasks: [{ id: 'personal-task', text: '读几页床头的那本书', createdAt: 123456789, completedAt: null }],
    stats: { completed: 0, released: 0 }
  } });
  const storage = memoryStorage({ 'sanri.app.v1': originalTasks });
  const first = loadI18n(storage);
  first.setLanguage('en');
  assert.equal(first.getLanguage(), 'en');
  assert.equal(first.getLocale(), 'en-US');
  assert.equal(storage.values.get('sanri.app.v1'), originalTasks);
  assert.deepEqual(storage.writes, [[first.KEY, 'en']]);
  const reopened = loadI18n(storage);
  assert.equal(reopened.getLanguage(), 'en');
  reopened.setLanguage('zh-CN');
  assert.equal(storage.values.get('sanri.app.v1'), originalTasks);
});

test('unsupported preferences fall back safely and cross-tab updates do not write back', () => {
  const storage = memoryStorage({ 'sanri.language.v1': 'unsupported' });
  const i18n = loadI18n(storage);
  assert.equal(i18n.getLanguage(), 'zh-CN');
  assert.equal(i18n.getLocale(), 'zh-CN');
  assert.equal(storage.writes.length, 0);
  i18n.setLanguage('en', false);
  assert.equal(i18n.getLanguage(), 'en');
  assert.equal(storage.writes.length, 0);
  i18n.setLanguage(null, false);
  assert.equal(i18n.getLanguage(), 'zh-CN');
  assert.equal(storage.writes.length, 0);
});

test('switching works even when browser storage is missing or blocked', () => {
  for (const storage of [undefined, {
    getItem() { throw new Error('Storage blocked'); },
    setItem() { throw new Error('Storage blocked'); }
  }]) {
    const i18n = loadI18n(storage);
    assert.equal(i18n.getLanguage(), 'zh-CN');
    assert.doesNotThrow(() => i18n.setLanguage('en'));
    assert.equal(i18n.getLanguage(), 'en');
    assert.equal(i18n.getLocale(), 'en-US');
    assert.doesNotThrow(() => i18n.apply());
  }
});

test('interpolation preserves user braces, markup, and replacement syntax as literal text', () => {
  const i18n = loadI18n(memoryStorage());
  const userText = '读书 {date} <img src=x onerror=alert(1)> $&';
  for (const language of ['zh-CN', 'en']) {
    i18n.setLanguage(language, false);
    const result = i18n.t('完成：{task}', { task: userText, date: 'must-not-replace' });
    assert.ok(result.endsWith(userText));
    assert.ok(result.includes('{date}'));
    assert.ok(!result.includes('must-not-replace'));
  }
});

test('applying translations writes plain text and leaves a draft input untouched', () => {
  const i18n = loadI18n(memoryStorage());
  i18n.setLanguage('en', false);
  const label = {
    textContent: '',
    getAttribute() { return '我的清单'; },
    set innerHTML(_) { throw new Error('Translations must not inject HTML'); }
  };
  const draft = { value: '保留我的草稿 {task}', attributes: {},
    getAttribute() { return '写一件想做的小事…'; },
    setAttribute(key, value) { this.attributes[key] = value; }
  };
  const englishButton = { dataset: { language: 'en' }, attributes: {},
    setAttribute(key, value) { this.attributes[key] = value; }
  };
  const document = {
    documentElement: { lang: 'zh-CN' },
    querySelectorAll(selector) {
      if (selector === '[data-i18n]') return [label];
      if (selector === '[data-i18n-placeholder]') return [draft];
      if (selector === '[data-language]') return [englishButton];
      return [];
    }
  };
  i18n.apply(document);
  assert.equal(document.documentElement.lang, 'en');
  assert.ok(label.textContent);
  assert.ok(draft.attributes.placeholder);
  assert.equal(draft.value, '保留我的草稿 {task}');
  assert.equal(englishButton.attributes['aria-pressed'], 'true');
});
