/* Small, local interactions only. Product screenshots and a labelled sample task. */
(() => {
  'use strict';

  function enhanceTabs(root, options) {
    if (!root) return null;
    const tablist = root.querySelector(options.tablist);
    const tabs = [...root.querySelectorAll(options.tabs)];
    const panels = [...root.querySelectorAll(options.panels)];
    if (!tablist || !tabs.length || panels.length !== tabs.length) return null;
    const byKey = new Map(panels.map(panel => [panel.getAttribute(options.panelKey), panel]));
    if (tabs.some(tab => !byKey.has(tab.getAttribute(options.tabKey)))) return null;

    const select = (key, focus = false) => {
      const chosen = tabs.find(tab => tab.getAttribute(options.tabKey) === key);
      if (!chosen) return;
      tabs.forEach(tab => {
        const active = tab === chosen;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        const panel = byKey.get(tab.getAttribute(options.tabKey));
        panel.hidden = !active;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.id);
        panel.tabIndex = 0;
      });
      if (focus) chosen.focus({ preventScroll: true });
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab.getAttribute(options.tabKey)));
      tab.addEventListener('keydown', event => {
        let next;
        const vertical = tablist.getAttribute('aria-orientation') === 'vertical';
        if (event.key === (vertical ? 'ArrowDown' : 'ArrowRight')) next = (index + 1) % tabs.length;
        if (event.key === (vertical ? 'ArrowUp' : 'ArrowLeft')) next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        select(tabs[next].getAttribute(options.tabKey), true);
      });
    });

    select(tabs[0].getAttribute(options.tabKey));
    tablist.hidden = false;
    root.classList.add('dev-enhanced');
    return { select, tablist };
  }

  enhanceTabs(document.querySelector('[data-ive-gallery]'), {
    tablist: '[data-ive-tabs]', tabs: '[data-ive-tab]', panels: '[data-ive-panel]',
    tabKey: 'data-ive-tab', panelKey: 'data-ive-panel'
  });

  const lab = document.querySelector('[data-any-lab]');
  const labTabs = enhanceTabs(lab, {
    tablist: '[data-any-tabs]', tabs: '[data-any-tab]', panels: '[data-any-panel]',
    tabKey: 'data-any-tab', panelKey: 'data-any-panel'
  });
  if (!lab || !labTabs) return;

  const compact = matchMedia('(max-width: 820px)');
  const orientTabs = () => labTabs.tablist.setAttribute('aria-orientation', compact.matches ? 'horizontal' : 'vertical');
  orientTabs();
  compact.addEventListener?.('change', orientTabs);

  lab.querySelectorAll('[data-any-next]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => {
      const key = button.getAttribute('data-any-next');
      labTabs.select(key);
      const panel = lab.querySelector(`[data-any-panel="${key}"]`);
      if (panel) {
        panel.focus({ preventScroll: true });
        panel.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
    });
  });

  const controls = lab.querySelector('[data-any-controls]');
  const query = lab.querySelector('#any-query');
  const changed = lab.querySelector('#any-changed');
  const run = lab.querySelector('[data-any-run]');
  const output = lab.querySelector('[data-any-output]');
  const resultTitle = lab.querySelector('[data-any-result-title]');
  const resultText = lab.querySelector('[data-any-result-text]');
  const resultList = lab.querySelector('[data-any-result-list]');
  const resultIcon = output?.querySelector('.dev-output-icon');
  if (![controls, query, changed, run, output, resultTitle, resultText, resultList, resultIcon].every(Boolean)) return;
  controls.hidden = false;

  function clearResults() {
    output.removeAttribute('data-outcome');
    resultIcon.textContent = '↳';
    resultTitle.textContent = 'Bereit für das nächste Beispiel.';
    resultText.textContent = changed.checked
      ? 'Die Portalseite ist in diesem Beispiel verändert. Führen Sie den Aufruf aus, um die Prüfung zu sehen.'
      : `Der gespeicherte Weg soll jetzt ${query.selectedOptions[0].textContent} suchen.`;
    resultList.replaceChildren();
    resultList.hidden = true;
  }

  query.addEventListener('change', clearResults);
  changed.addEventListener('change', clearResults);
  run.addEventListener('click', () => {
    resultList.replaceChildren();
    if (changed.checked) {
      output.dataset.outcome = 'changed';
      resultIcon.textContent = '!';
      resultTitle.textContent = 'Angehalten: Ergebnis nicht bestätigt.';
      resultText.textContent = 'Im Beispiel hat sich die Portalseite geändert. Der gespeicherte Weg liefert keine geprüfte Belegliste. Er muss repariert und erneut geprüft werden.';
      resultList.hidden = true;
      return;
    }
    output.dataset.outcome = 'success';
    resultIcon.textContent = '✓';
    resultTitle.textContent = 'Beispiel abgeschlossen: 2 Belege gefunden.';
    resultText.textContent = 'Der gespeicherte Weg wurde mit der gewählten Eingabe wiederverwendet.';
    const documents = query.value === 'angebote'
      ? ['Angebot_210.pdf', 'Angebot_211.pdf']
      : ['Rechnung_1042.pdf', 'Rechnung_1043.pdf'];
    documents.forEach(name => {
      const item = document.createElement('li');
      item.textContent = name;
      resultList.append(item);
    });
    resultList.hidden = false;
  });
})();
