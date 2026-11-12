/* A scripted example, not a live call. No microphone, storage or network requests. */
(() => {
  'use strict';
  const desk = document.querySelector('[data-voice-demo]');
  if (!desk) return;
  const tabs = [...desk.querySelectorAll('[data-voice-case]')];
  const panels = [...desk.querySelectorAll('[data-voice-panel]')];
  const counter = desk.querySelector('[data-voice-counter]');
  const next = desk.querySelector('[data-voice-next]');
  const status = desk.querySelector('[data-voice-status]');
  if (!tabs.length || !panels.length || !next || !counter) return;
  let caseIndex = 0;
  let step = 0;
  const labels = ['Anliegen', 'Abgleich', 'Ergebnis'];

  function render(announce = true) {
    const selected = tabs[caseIndex].dataset.voiceCase;
    tabs.forEach((tab, index) => {
      const active = index === caseIndex;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach(panel => {
      panel.hidden = panel.dataset.voicePanel !== selected;
      panel.querySelectorAll('[data-voice-scene]').forEach(scene => {
        scene.hidden = Number(scene.dataset.voiceScene) !== step;
      });
      panel.querySelectorAll('[data-voice-step]').forEach(button => {
        button.setAttribute('aria-pressed', String(Number(button.dataset.voiceStep) === step));
      });
    });
    counter.textContent = `Schritt ${step + 1} von 3`;
    next.replaceChildren(document.createTextNode(step === 2 ? 'Noch einmal' : 'Nächster Schritt'));
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = step === 2 ? '↺' : '→';
    next.append(arrow);
    if (announce && status) {
      status.textContent = `${tabs[caseIndex].textContent.trim()}: Schritt ${step + 1} von 3 – ${labels[step]}.`;
    }
  }

  function selectCase(index, focus = false) {
    caseIndex = index;
    step = 0;
    render();
    if (focus) tabs[index].focus();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectCase(index));
    tab.addEventListener('keydown', event => {
      let indexToSelect;
      if (event.key === 'ArrowRight') indexToSelect = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') indexToSelect = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') indexToSelect = 0;
      else if (event.key === 'End') indexToSelect = tabs.length - 1;
      else return;
      event.preventDefault();
      selectCase(indexToSelect, true);
    });
  });
  desk.querySelectorAll('[data-voice-step]').forEach(button => {
    button.addEventListener('click', () => {
      step = Number(button.dataset.voiceStep);
      render();
    });
  });
  next.addEventListener('click', () => {
    step = (step + 1) % 3;
    render();
  });
  desk.querySelectorAll('.voice-demo-tabs,.voice-stepper,.voice-demo-controls').forEach(element => {
    element.hidden = false;
  });
  render(false);
})();
