/* With scripting off, the product picker is a set of links to the detail pages. */
(() => {
  const examples = document.querySelectorAll('[data-product-experience]');
  examples.forEach((host, index) => {
    const panels = Array.from(host.querySelectorAll('[data-experience-panel]'));
    const tabs = Array.from(host.querySelectorAll('[data-experience-select]'));

    function select(view) {
      host.dataset.view = view;
      for (const panel of panels) panel.hidden = panel.dataset.experiencePanel !== view;
      for (const tab of tabs) {
        const active = tab.dataset.experienceSelect === view;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
      }
    }

    if (host.classList.contains('experience-overview')) {
      host.querySelector('.experience-tabs').setAttribute('role', 'tablist');
      tabs.forEach((tab, position) => {
        const view = tab.dataset.experienceSelect;
        const panel = panels.find(item => item.dataset.experiencePanel === view);
        const prefix = 'experience-' + (index + 1) + '-' + view;
        panel.id = prefix;
        tab.id = prefix + '-tab';
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', panel.id);
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.id);
        panel.tabIndex = 0;

        tab.addEventListener('click', event => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
          event.preventDefault();
          select(view);
        });
        tab.addEventListener('keydown', event => {
          let next;
          switch (event.key) {
            case 'ArrowRight': next = (position + 1) % tabs.length; break;
            case 'ArrowLeft': next = (position + tabs.length - 1) % tabs.length; break;
            case 'Home': next = 0; break;
            case 'End': next = tabs.length - 1; break;
            case ' ': event.preventDefault(); select(view); return;
            default: return;
          }
          event.preventDefault();
          select(tabs[next].dataset.experienceSelect);
          tabs[next].focus();
        });
      });
      select(host.dataset.initialView);
    } else {
      // On a product page the build already renders the corresponding article.
      host.dataset.view = host.dataset.initialView;
    }

    const approve = host.querySelector('[data-workflow-approve]');
    const pending = host.querySelector('[data-workflow-pending]');
    const approved = host.querySelector('[data-workflow-approved]');
    approve.addEventListener('click', () => {
      const allow = approve.getAttribute('aria-pressed') === 'false';
      approve.setAttribute('aria-pressed', String(allow));
      approved.hidden = !allow;
      pending.hidden = allow;
    });
    approve.hidden = false;
    host.dataset.ready = 'true';
  });
})();
