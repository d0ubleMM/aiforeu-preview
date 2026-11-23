/* The examples are readable before scripting. Only the draft needs a control. */
(() => {
  for (const host of document.querySelectorAll('[data-experience-panel="workflows"]')) {
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
  }
})();
