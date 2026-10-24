(function () {
  'use strict';
  const E = window.ThreeDaysEngine;
  const formatText = window.ThreeDaysCopy.formatText;
  // Keep the original storage key so existing lists and deadlines remain available.
  const KEY = 'sanri.app.v1';
  const $ = (id) => document.getElementById(id);
  const stageNames = { fresh: "Just beginning", fading: "Fading gently", leaving: "Almost gone" };
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
    $('storage-status').textContent = formatText(storageAvailable
      ? "Saved only on this device. Your thoughts stay yours."
      : "Storage is unavailable. This list will last only for this session.");
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
    $('toast-text').textContent = formatText(message);
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
      showToast("Maybe it wasn’t that important. Gently let go.", null, 'wind', 8000);
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
      E.createTask("Take a walk and bring home some flowers", demoAnchor - 2 * E.HOUR, 'example-flowers'),
      E.createTask("Read a few pages of that bedside book", demoAnchor - 28 * E.HOUR, 'example-book'),
      E.createTask("Sort through those saved ideas", demoAnchor - 52 * E.HOUR, 'example-ideas'),
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
    if (ms < 60000) return formatText("Drifting away soon");
    const totalMinutes = Math.ceil(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (!hours) return formatText("{minutes} min left", { minutes });
    return formatText("{hours}h{minutes} left", { hours, minutes: hours < 3 && minutes ? formatText(" {minutes}m", { minutes }) : '' });
  }
  function ageLabel(age) {
    if (age < E.HOUR) return formatText("Just added");
    if (age < 24 * E.HOUR) return formatText("Added today");
    if (age < 48 * E.HOUR) return formatText("Added yesterday");
    return formatText("Added two days ago");
  }
  function taskRow(task, now) {
    const text = task.text;
    const done = task.completedAt !== null;
    const life = E.getTaskLife(task, now);
    const row = element('article', `task-row ${done ? 'completed' : life.stage}`);
    row.dataset.id = task.id;
    row.style.setProperty('--task-opacity', done ? '1' : String(life.opacity));
    const check = element('button', 'task-check');
    check.type = 'button';
    check.append(icon('check'));
    check.setAttribute('aria-label', formatText(done ? "Done: {task}" : "Complete: {task}", { task: text }));
    if (done) check.disabled = true;
    else check.addEventListener('click', () => complete(task));
    const main = element('div', 'task-main');
    main.append(element('h3', 'task-name', text));
    const meta = element('div', 'task-meta');
    const tag = element('span', 'stage-tag');
    tag.append(icon(done ? 'check' : life.stage === 'fresh' ? 'sun' : life.stage === 'fading' ? 'leaf' : 'wind'));
    tag.append(document.createTextNode(formatText(done ? "Thoughtfully done" : stageNames[life.stage] || "Gently let go")));
    meta.append(tag);
    meta.append(element('span', 'meta-divider'));
    const completedDate = done ? new Date(task.completedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '';
    meta.append(element('span', 'task-age', done ? formatText("Done on {date}", { date: completedDate }) : ageLabel(life.age)));
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
    time.append(document.createTextNode(done ? formatText("Nicely done") : remainingLabel(life.remaining)));
    if (!done) time.title = formatText("Fades away on {date}", { date: new Date(task.createdAt + E.TTL).toLocaleString('en-US') });
    right.append(time);
    if (!done) {
      const release = element('button', 'task-release');
      release.type = 'button';
      release.title = formatText("Let it go now");
      release.setAttribute('aria-label', formatText("Let go: {task}", { task: text }));
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
    let heading = "A little space feels just right.";
    let text = "Add something when it comes to mind. For now, just live.";
    if (view === 'completed') {
      heading = "No rush. Find your own rhythm.";
      text = "The things you finish will find a little home here.";
    } else if (filter !== 'all') {
      heading = "Nothing at this stage right now.";
      text = "Try another filter, or enjoy a little space.";
    } else if (demo && demoHours >= 70) {
      heading = "Maybe it wasn’t that important.";
      text = "Three days have passed. The list is clear. Breathe a little easier.";
      empty.classList.add('empty-farewell');
    }
    empty.append(element('h3', '', formatText(heading)), element('p', '', formatText(text)));
    if (view === 'active') {
      const action = element('button', '', formatText(filter !== 'all' ? "See all the little things →" : demo ? "Add my first little thing →" : "＋ Add a little thing"));
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
    $('exit-demo').textContent = formatText(started ? "Back to my list ↗" : "Start my list ↗");
    $('demo-controls').hidden = !demo;
    $('enter-demo').hidden = demo;
    $('demo-description').textContent = formatText(demo ? "Move time forward. Watch things get lighter." : "No need to wait three days. See a task fade away.");
    $('time-output').textContent = formatText("{hours}h", { hours: demoHours });
    $('time-slider').setAttribute('aria-valuetext', formatText("{hours}h", { hours: demoHours }));
    $('time-slider').style.setProperty('--slider-progress', `${demoHours / 72 * 100}%`);
    $('list-time-note').textContent = formatText(demo ? "A sample · yours stays safe" : "Each task · 3 days");
    for (const button of document.querySelectorAll('[data-view]')) {
      const selected = button.dataset.view === view;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    $('filter-button').hidden = view === 'completed';
    if (view === 'completed') $('filter-options').hidden = true;
    $('filter-button').setAttribute('aria-expanded', String(!$('filter-options').hidden));
    const filterLabel = formatText(filter === 'all' ? "All stages" : stageNames[filter]);
    $('filter-button').replaceChildren(document.createTextNode(`${filterLabel} `), element('span', '', '⌄'));
    $('filter-button').setAttribute('aria-label', formatText("Filter by age: {stage}", { stage: filterLabel }));
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
    showToast("One little thing done. You’re doing just fine.", () => {
      if (context !== demo) return;
      const before = currentState();
      const restored = E.undoCompletion(before, task.id, currentTime());
      updateState(restored, origin => E.undoCompletion(origin, task.id, currentTime()));
      showToast(restored === before ? "Three days have passed. Let it stay in Done." : "Back on your list. Take it at your own pace.");
    }, 'check');
  }
  function letGo(task) {
    const context = demo;
    const index = [...$('task-list').children].findIndex(el => el.dataset.id === task.id);
    updateState(E.releaseTask(currentState(), task.id, currentTime()), origin => E.releaseTask(origin, task.id, currentTime()));
    restoreFocus(index);
    showToast("Maybe it wasn’t that important. Letting go is okay.", () => {
      if (context !== demo) return;
      const before = currentState();
      const restored = E.restoreReleasedTask(before, task, currentTime());
      updateState(restored, origin => E.restoreReleasedTask(origin, task, currentTime()));
      showToast(restored === before ? "Three days have passed. Let it drift away." : "Back on your list, with its original three days.");
    }, 'wind');
  }

  $('task-form').addEventListener('submit', event => {
    event.preventDefault();
    const text = $('task-input').value.trim();
    if (!text) { $('task-input').setCustomValidity(formatText("Write a little thing before adding it.")); $('task-input').reportValidity(); return; }
    if (demo) exitDemo();
    finishExpiration(false);
    started = true;
    view = 'active';
    filter = 'all';
    try {
      updateState(E.addTask(state, text, Date.now()));
      $('task-input').value = '';
      $('task-input').focus();
      showToast(storageAvailable ? "Added. Give it three days, and give yourself a little room." : "Added, but your list could not be saved on this device.");
    } catch (error) { showToast(error.message); }
  });
  $('task-input').addEventListener('input', () => $('task-input').setCustomValidity(''));
  $('task-input').addEventListener('invalid', () => {
    if ($('task-input').validity.valueMissing) $('task-input').setCustomValidity(formatText("Write a little thing before adding it."));
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
    if (demoState.stats.released > previousCount) showToast("Maybe it wasn’t that important. It has drifted away.", null, 'wind');
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
    if (event.key !== KEY && event.key !== null) return;
    dismissToast();
    state = E.createState();
    started = false;
    load();
    finishExpiration(true);
    if (!demo) render();
  });
  load();
  if (started) { finishExpiration(true); render(); }
  else enterDemo();
  setInterval(tick, 1000);
})();
