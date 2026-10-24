(function () {
  'use strict';
  const E = window.SanriEngine;
  const I = window.SanriI18n;
  const t = I.t;
  const KEY = 'sanri.app.v1';
  const $ = (id) => document.getElementById(id);
  const stageNames = { fresh: '刚刚开始', fading: '渐渐变淡', leaving: '快要消失' };
  let state = E.createState();
  let started = false;
  let storageAvailable = true;
  let demo = false;
  let demoState = E.createState();
  let demoOrigin = E.createState();
  let demoAnchor = Date.now();
  let demoHours = 0;
  let view = 'active';
  let filter = 'all';
  let undo = null;
  let toastTimer;
  let toastMessage = '';
  let expirationTimer;
  let pendingExpiry = false;
  let unannouncedExpired = 0;
  let lastMinute = -1;

  function icon(name, className = '') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', `icon ${className}`);
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#i-${name}`);
    svg.append(use);
    return svg;
  }
  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function currentState() { return demo ? demoState : state; }
  function currentTime() { return demo ? demoAnchor + demoHours * E.HOUR : Date.now(); }
  function storageStatus() {
    $('storage-status').textContent = t(storageAvailable
      ? '只保存在你的浏览器里。你的心事，只属于你。'
      : '浏览器暂时无法保存；本次清单仅在当前页面有效。');
  }
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ started: true, state }));
      storageAvailable = true;
    } catch {
      storageAvailable = false;
    }
    storageStatus();
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.started === true) {
          started = true;
          state = E.normalizeState(data.state, Date.now());
        }
      }
    } catch {
      storageAvailable = false;
    }
    storageStatus();
  }
  function updateState(next, demoAction) {
    if (demo) {
      if (demoAction) demoOrigin = demoAction(demoOrigin);
      demoState = demoAction ? E.sweepExpired(demoOrigin, currentTime()).state : next;
    }
    else { state = next; persist(); }
    render();
  }
  function dismissToast() {
    clearTimeout(toastTimer);
    $('toast').hidden = true;
    undo = null;
  }
  function showToast(message, callback, glyph = 'leaf', duration = 6500) {
    clearTimeout(toastTimer);
    toastMessage = message;
    $('toast-text').textContent = t(message);
    $('toast-icon').setAttribute('href', `#i-${glyph}`);
    $('undo-button').hidden = !callback;
    $('toast').hidden = false;
    undo = callback || null;
    toastTimer = setTimeout(dismissToast, duration);
  }
  function finishExpiration(announce = true) {
    clearTimeout(expirationTimer);
    pendingExpiry = false;
    const result = E.sweepExpired(state, Date.now());
    if (result.expiredCount) {
      state = result.state;
      unannouncedExpired += result.expiredCount;
      persist();
      if (!demo) render();
    }
    if (announce && !demo && !document.hidden && unannouncedExpired) {
      unannouncedExpired = 0;
      showToast('这件事其实没那么重要。轻轻放下了。', null, 'wind', 8000);
    }
  }
  function tick() {
    if (!started) return;
    const now = Date.now();
    const expired = state.tasks.filter(task => task.completedAt === null && E.getTaskLife(task, now).remaining === 0);
    if (expired.length && !pendingExpiry) {
      if (demo || document.hidden) { finishExpiration(false); return; }
      pendingExpiry = true;
      for (const task of expired) {
        const row = [...$('task-list').children].find(el => el.dataset.id === task.id);
        if (row) row.classList.add('vanishing');
      }
      expirationTimer = setTimeout(() => finishExpiration(true), 650);
    }
    const minute = Math.floor(now / 60000);
    if (!demo && !pendingExpiry && minute !== lastMinute) { lastMinute = minute; render(); }
  }
  function newDemo() {
    demoAnchor = Date.now();
    demoHours = 0;
    demoOrigin = E.createState();
    demoOrigin.tasks = [
      E.createTask('出门走走，买一束喜欢的花', demoAnchor - 2 * E.HOUR, 'example-flowers'),
      E.createTask('读几页床头的那本书', demoAnchor - 28 * E.HOUR, 'example-book'),
      E.createTask('整理一下收藏夹里的灵感', demoAnchor - 52 * E.HOUR, 'example-ideas'),
    ];
    demoState = demoOrigin;
    $('time-slider').value = '0';
  }
  function enterDemo() {
    finishExpiration(false);
    dismissToast();
    newDemo();
    demo = true;
    view = 'active';
    filter = 'all';
    render();
  }
  function exitDemo() {
    dismissToast();
    demo = false;
    started = true;
    view = 'active';
    filter = 'all';
    finishExpiration(true);
    persist();
    render();
  }
  function remainingLabel(ms) {
    if (ms < 60000) return t('即将随风离开');
    const totalMinutes = Math.ceil(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (!hours) return t('还有 {minutes} 分钟', { minutes });
    return t('还有 {hours} 小时{minutes}', { hours, minutes: hours < 3 && minutes ? t(' {minutes} 分', { minutes }) : '' });
  }
  function ageLabel(age) {
    if (age < E.HOUR) return t('刚刚放进来');
    if (age < 24 * E.HOUR) return t('今天放进来');
    if (age < 48 * E.HOUR) return t('昨天放进来');
    return t('前天放进来');
  }
  function taskRow(task, now) {
    const text = demo ? t(task.text) : task.text;
    const done = task.completedAt !== null;
    const life = E.getTaskLife(task, now);
    const row = element('article', `task-row ${done ? 'completed' : life.stage}`);
    row.dataset.id = task.id;
    row.style.setProperty('--task-opacity', done ? '1' : String(life.opacity));
    const check = element('button', 'task-check');
    check.type = 'button';
    check.append(icon('check'));
    check.setAttribute('aria-label', t(done ? '已完成：{task}' : '完成：{task}', { task: text }));
    if (done) check.disabled = true;
    else check.addEventListener('click', () => complete(task));
    const main = element('div', 'task-main');
    main.append(element('h3', 'task-name', text));
    const meta = element('div', 'task-meta');
    const tag = element('span', 'stage-tag');
    tag.append(icon(done ? 'check' : life.stage === 'fresh' ? 'sun' : life.stage === 'fading' ? 'leaf' : 'wind'));
    tag.append(document.createTextNode(t(done ? '认真做完了' : stageNames[life.stage] || '轻轻离开')));
    meta.append(tag);
    meta.append(element('span', 'meta-divider'));
    const completedDate = done ? new Date(task.completedAt).toLocaleDateString(I.getLocale(), { month: 'long', day: 'numeric' }) : '';
    meta.append(element('span', 'task-age', done ? t('{date}完成', { date: completedDate }) : ageLabel(life.age)));
    if (!done) {
      const dots = element('span', 'life-dots');
      dots.setAttribute('aria-hidden', 'true');
      const count = life.stage === 'fresh' ? 3 : life.stage === 'fading' ? 2 : 1;
      for (let i = 0; i < 3; i++) dots.append(element('i', i >= count ? 'faded' : ''));
      meta.append(dots);
    }
    main.append(meta);
    const right = element('div', 'task-right');
    const time = element('span', 'task-time');
    time.append(icon(done ? 'check' : 'clock'));
    time.append(document.createTextNode(done ? t('做得很好') : remainingLabel(life.remaining)));
    if (!done) time.title = t('将于 {date} 自然消失', { date: new Date(task.createdAt + E.TTL).toLocaleString(I.getLocale()) });
    right.append(time);
    if (!done) {
      const release = element('button', 'task-release');
      release.type = 'button';
      release.title = t('现在就放下');
      release.setAttribute('aria-label', t('放下：{task}', { task: text }));
      release.append(icon('close'));
      release.addEventListener('click', () => letGo(task));
      right.append(release);
    }
    row.append(check, main, right);
    return row;
  }
  function emptyState() {
    const empty = element('div', 'empty-state');
    const mark = element('span', 'empty-icon');
    mark.append(icon(view === 'completed' ? 'check' : 'leaf'));
    empty.append(mark);
    let heading = '空白，也是一种刚刚好。';
    let text = '想到什么再写下。现在，先好好生活。';
    if (view === 'completed') {
      heading = '不着急，按自己的节奏。';
      text = '做完的小事，会在这里留下一个小小的肯定。';
    } else if (filter !== 'all') {
      heading = '此刻，没有这样的待办。';
      text = '换个状态看看，或给自己留一点空白。';
    } else if (demo && demoHours >= 70) {
      heading = '这件事其实没那么重要';
      text = '三天过去了。清单空了，你也可以轻一点。';
      empty.classList.add('empty-farewell');
    }
    empty.append(element('h3', '', t(heading)), element('p', '', t(text)));
    if (view === 'active') {
      const action = element('button', '', t(filter !== 'all' ? '看看全部小事 →' : demo ? '写下我的第一件小事 →' : '＋ 写一件小事'));
      action.addEventListener('click', () => {
        if (filter !== 'all') { filter = 'all'; render(); }
        else { if (demo) exitDemo(); $('task-input').focus(); }
      });
      empty.append(action);
    }
    return empty;
  }
  function render() {
    const data = currentState();
    const now = currentTime();
    const active = data.tasks.filter(task => task.completedAt === null && E.getTaskLife(task, now).remaining > 0);
    const completed = data.tasks.filter(task => task.completedAt !== null).sort((a, b) => b.completedAt - a.completedAt);
    $('active-count').textContent = String(active.length);
    $('completed-count').textContent = String(completed.length);
    $('stat-completed').textContent = String(data.stats.completed);
    $('stat-released').textContent = String(data.stats.released);
    $('demo-banner').hidden = !demo;
    $('exit-demo').textContent = t(started ? '返回我的清单 ↗' : '开始我的清单 ↗');
    $('demo-controls').hidden = !demo;
    $('enter-demo').hidden = demo;
    $('demo-description').textContent = t(demo ? '拖动时间，看小事慢慢变轻。' : '不用等三天，看看待办怎样轻轻消失。');
    $('time-output').textContent = t('{hours} 小时', { hours: demoHours });
    $('time-slider').setAttribute('aria-valuetext', t('{hours} 小时', { hours: demoHours }));
    $('time-slider').style.setProperty('--slider-progress', `${demoHours / 72 * 100}%`);
    $('list-time-note').textContent = t(demo ? '示例清单 · 可放心体验' : '每件事 · 3 天');
    for (const button of document.querySelectorAll('[data-view]')) {
      const selected = button.dataset.view === view;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    $('filter-button').hidden = view === 'completed';
    if (view === 'completed') $('filter-options').hidden = true;
    $('filter-button').setAttribute('aria-expanded', String(!$('filter-options').hidden));
    const filterLabel = t(filter === 'all' ? '全部状态' : stageNames[filter]);
    $('filter-button').replaceChildren(document.createTextNode(`${filterLabel} `), element('span', '', '⌄'));
    $('filter-button').setAttribute('aria-label', t('筛选时间状态：{stage}', { stage: filterLabel }));
    for (const button of document.querySelectorAll('[data-filter]')) button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
    const tasks = view === 'completed' ? completed : active.filter(task => filter === 'all' || E.getTaskLife(task, now).stage === filter);
    const focused = document.activeElement;
    const focusLabel = focused && $('task-list').contains(focused) ? focused.getAttribute('aria-label') : null;
    $('task-list').replaceChildren(...(tasks.length ? tasks.map(task => taskRow(task, now)) : [emptyState()]));
    if (focusLabel) {
      const button = [...$('task-list').querySelectorAll('button')].find(el => el.getAttribute('aria-label') === focusLabel);
      if (button) button.focus({ preventScroll: true });
    }
  }
  function restoreFocus(index) {
    const buttons = [...$('task-list').querySelectorAll('.task-check:not(:disabled)')];
    if (buttons.length) buttons[Math.min(index, buttons.length - 1)].focus({ preventScroll: true });
    else $('task-input').focus({ preventScroll: true });
  }
  function complete(task) {
    const context = demo;
    const index = [...$('task-list').children].findIndex(el => el.dataset.id === task.id);
    const data = currentState();
    const next = E.completeTask(data, task.id, currentTime());
    if (next === data) { tick(); return; }
    updateState(next, origin => E.completeTask(origin, task.id, currentTime()));
    restoreFocus(index);
    showToast('又做好了一件小事。今天的你，很好。', () => {
      if (context !== demo) return;
      const before = currentState();
      const restored = E.undoCompletion(before, task.id, currentTime());
      updateState(restored, origin => E.undoCompletion(origin, task.id, currentTime()));
      showToast(restored === before ? '三天已经过去，就让它留在已完成里吧。' : '放回清单了。按自己的节奏来。');
    }, 'check');
  }
  function letGo(task) {
    const context = demo;
    const index = [...$('task-list').children].findIndex(el => el.dataset.id === task.id);
    updateState(E.releaseTask(currentState(), task.id, currentTime()), origin => E.releaseTask(origin, task.id, currentTime()));
    restoreFocus(index);
    showToast('这件事其实没那么重要。放下，也很好。', () => {
      if (context !== demo) return;
      const before = currentState();
      const restored = E.restoreReleasedTask(before, task, currentTime());
      updateState(restored, origin => E.restoreReleasedTask(origin, task, currentTime()));
      showToast(restored === before ? '三天已经过去，就让它轻轻离开吧。' : '放回清单了，仍是最初的三天。');
    }, 'wind');
  }

  function changeLanguage(language, persist = true) {
    I.setLanguage(language, persist);
    I.apply();
    storageStatus();
    render();
    if (!$('toast').hidden) $('toast-text').textContent = t(toastMessage);
    if ($('task-input').validity.customError) $('task-input').setCustomValidity(t('写下一件小事，再放进来吧。'));
  }
  for (const button of document.querySelectorAll('[data-language]')) {
    button.addEventListener('click', () => changeLanguage(button.dataset.language));
  }

  $('task-form').addEventListener('submit', event => {
    event.preventDefault();
    const text = $('task-input').value.trim();
    if (!text) { $('task-input').setCustomValidity(t('写下一件小事，再放进来吧。')); $('task-input').reportValidity(); return; }
    if (demo) exitDemo();
    finishExpiration(false);
    started = true;
    view = 'active';
    filter = 'all';
    try {
      updateState(E.addTask(state, text, Date.now()));
      $('task-input').value = '';
      $('task-input').focus();
      showToast(storageAvailable ? '放进来了。给它三天，也给自己一点余地。' : '已放进清单，但浏览器暂时无法保存。');
    } catch (error) { showToast(error.message); }
  });
  $('task-input').addEventListener('input', () => $('task-input').setCustomValidity(''));
  $('task-input').addEventListener('invalid', () => {
    if ($('task-input').validity.valueMissing) $('task-input').setCustomValidity(t('写下一件小事，再放进来吧。'));
  });
  $('exit-demo').addEventListener('click', () => { exitDemo(); $('task-input').focus(); });
  $('enter-demo').addEventListener('click', enterDemo);
  $('reset-demo').addEventListener('click', () => { dismissToast(); newDemo(); render(); });
  $('time-slider').addEventListener('input', event => {
    dismissToast();
    const previousCount = demoState.stats.released;
    demoHours = Number(event.target.value);
    demoState = E.sweepExpired(demoOrigin, currentTime()).state;
    render();
    if (demoState.stats.released > previousCount) showToast('这件事其实没那么重要。它已经随风离开。', null, 'wind');
  });
  for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => { view = button.dataset.view; render(); });
  for (const button of document.querySelectorAll('[data-filter]')) button.addEventListener('click', () => { filter = button.dataset.filter; render(); });
  $('filter-button').setAttribute('aria-expanded', 'false');
  $('filter-button').setAttribute('aria-controls', 'filter-options');
  $('filter-button').addEventListener('click', () => {
    $('filter-options').hidden = !$('filter-options').hidden;
    $('filter-button').setAttribute('aria-expanded', String(!$('filter-options').hidden));
  });
  $('undo-button').addEventListener('click', () => { const action = undo; dismissToast(); if (action) action(); });
  $('dismiss-toast').addEventListener('click', dismissToast);
  $('about-button').addEventListener('click', () => $('about-dialog').showModal());
  $('close-about').addEventListener('click', () => $('about-dialog').close());
  $('understood-button').addEventListener('click', () => $('about-dialog').close());
  $('about-dialog').addEventListener('click', event => {
    if (event.target !== $('about-dialog')) return;
    const rect = $('about-dialog').getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('about-dialog').close();
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !$('about-dialog').open) {
      event.preventDefault(); $('task-input').focus();
    }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { finishExpiration(true); if (!demo) render(); } });
  window.addEventListener('focus', () => { finishExpiration(true); if (!demo) render(); });
  window.addEventListener('storage', event => {
    if (event.key === I.KEY) { changeLanguage(event.newValue, false); return; }
    if (event.key === null) changeLanguage(I.readLanguage(), false);
    if (event.key !== KEY && event.key !== null) return;
    dismissToast();
    state = E.createState();
    started = false;
    load();
    finishExpiration(true);
    if (!demo) render();
  });
  I.apply();
  load();
  if (started) { finishExpiration(true); render(); }
  else enterDemo();
  setInterval(tick, 1000);
})();
