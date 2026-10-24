(function () {
  'use strict';
  const KEY = 'three-days.theme.v1';
  const themes = [
    { id: 'sage', name: 'Sage', note: 'A quiet little garden', mode: 'Light' },
    { id: 'linen', name: 'Linen', note: 'Paper, sunlight, slow mornings', mode: 'Light' },
    { id: 'rosewater', name: 'Rosewater', note: 'A softer shade of everyday', mode: 'Light' },
    { id: 'tide', name: 'Tide', note: 'A breath of ocean air', mode: 'Light' },
    { id: 'midnight', name: 'Midnight', note: 'Room to think after dark', mode: 'Dark' },
    { id: 'graphite', name: 'Graphite', note: 'Less color. More clarity.', mode: 'Dark' },
  ];
  let selected = 'sage';
  function apply(value) {
    selected = themes.some(theme => theme.id === value) ? value : 'sage';
    document.documentElement.dataset.theme = selected;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
    for (const button of document.querySelectorAll('[data-theme-choice]')) {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === selected));
    }
  }
  // Runs before the page is painted so a saved dark theme never flashes light.
  try { apply(localStorage.getItem(KEY)); } catch { apply('sage'); }
  window.ThreeDaysAppearance = Object.freeze({
    reset() { localStorage.removeItem(KEY); apply('sage'); },
  });
  document.addEventListener('DOMContentLoaded', () => {
    const dialog = document.getElementById('appearance-dialog');
    const status = document.getElementById('theme-status');
    for (const theme of themes) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'theme-card';
      button.dataset.palette = theme.id;
      button.dataset.themeChoice = theme.id;
      button.setAttribute('aria-label', `${theme.name}. ${theme.note}. ${theme.mode} theme.`);
      const preview = document.createElement('span');
      preview.className = 'theme-preview';
      preview.setAttribute('aria-hidden', 'true');
      for (const name of ['preview-orb', 'preview-title', 'preview-line', 'preview-line short', 'preview-sheet']) {
        const part = document.createElement('span');
        part.className = name;
        preview.append(part);
      }
      const label = document.createElement('span');
      label.className = 'theme-label';
      const name = document.createElement('strong');
      name.textContent = theme.name;
      const mode = document.createElement('span');
      mode.className = 'theme-mode';
      mode.textContent = theme.mode;
      label.append(name, mode);
      const note = document.createElement('span');
      note.className = 'theme-note';
      note.textContent = theme.note;
      button.append(preview, label, note);
      button.addEventListener('click', () => {
        apply(theme.id);
        try {
          localStorage.setItem(KEY, theme.id);
          status.textContent = `${theme.name} is saved on this device.`;
        } catch { status.textContent = `${theme.name} is active for this session. Storage is unavailable.`; }
      });
      document.getElementById('theme-options').append(button);
    }
    apply(selected);
    document.getElementById('appearance-button').addEventListener('click', () => {
      status.textContent = `${themes.find(theme => theme.id === selected).name} is your current theme.`;
      dialog.showModal();
      dialog.querySelector('[aria-pressed="true"]').focus();
    });
    for (const id of ['close-appearance', 'done-appearance']) {
      document.getElementById(id).addEventListener('click', () => dialog.close());
    }
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  });
  window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) apply(event.key === null ? null : event.newValue);
  });
})();
