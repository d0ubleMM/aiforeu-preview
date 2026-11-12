/* Illustrative examples only. No requests, submissions or changes to business data. */
(() => {
  'use strict';
  document.querySelectorAll('[data-offer-examples]').forEach(root => {
    const tablist = root.querySelector('[data-offer-tabs]');
    const tabs = [...root.querySelectorAll('[data-offer-tab]')];
    const panels = [...root.querySelectorAll('[data-offer-panel]')];
    if (!tablist || !tabs.length || tabs.length !== panels.length ||
        tabs.some(tab => !panels.some(panel => panel.id === tab.dataset.offerTab))) return;

    function select(tab) {
      tabs.forEach(item => {
        const active = item === tab;
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
      });
      panels.forEach(panel => { panel.hidden = panel.id !== tab.dataset.offerTab; });
    }

    panels.forEach(panel => {
      const stateLabel = panel.querySelector('[data-result-state]');
      const status = panel.querySelector('[data-example-status]');
      const actions = panel.querySelector('[data-example-actions]');
      const buttons = [...panel.querySelectorAll('[data-example-action]')];
      if (!stateLabel || !status || !actions || !buttons.length) return;
      const initialLabel = stateLabel.textContent;
      const decision = panel.querySelector('[data-decision-text]');
      const initialDecision = decision?.textContent;

      buttons.forEach(button => button.addEventListener('click', () => {
        const action = button.dataset.exampleAction;
        const state = action === 'approve' ? 'approved' : action === 'query' ? 'query' : 'pending';
        panel.dataset.exampleState = state;
        if (state === 'approved') {
          stateLabel.textContent = panel.dataset.approvedLabel;
          status.textContent = panel.dataset.approvedMessage;
          if (decision) decision.textContent = 'Im Beispiel freigegeben. Der nächste Schritt kann beginnen.';
        } else if (state === 'query') {
          stateLabel.textContent = 'Wartet auf Klärung';
          status.textContent = 'Rückfrage im Beispiel: Die zuständige Person klärt die offenen Angaben. Der nächste Schritt bleibt angehalten.';
          if (decision) decision.textContent = 'Rückfrage offen. Die Freigabe steht noch aus.';
        } else {
          stateLabel.textContent = initialLabel;
          status.textContent = 'Beispiel zurückgesetzt. Es wurden keine Daten verarbeitet oder übertragen.';
          if (decision) decision.textContent = initialDecision;
        }
        buttons.forEach(item => {
          const type = item.dataset.exampleAction;
          item.hidden = type === 'reset' ? state === 'pending' : state === 'approved';
        });
        // If the activated control disappears, move focus to the next available action.
        if (button.hidden) buttons.find(item => !item.hidden)?.focus({ preventScroll: true });
      }));
      actions.hidden = false;
    });

    tabs.forEach((tab, index) => {
      const panel = panels.find(item => item.id === tab.dataset.offerTab);
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.tabIndex = 0;
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        select(tabs[next]);
        tabs[next].focus();
      });
    });
    tablist.setAttribute('role', 'tablist');
    tablist.hidden = false;
    select(tabs[0]);
    root.dataset.enhanced = 'true';
  });
})();
