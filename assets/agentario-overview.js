/* Every example also has a working page link. Open it in place when supported. */
(() => {
  for (const link of document.querySelectorAll('[data-ap-open]')) {
    const dialog = document.getElementById(link.dataset.apOpen);
    if (!dialog || typeof dialog.showModal !== 'function') continue;
    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-controls', dialog.id);
    link.addEventListener('click', event => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      dialog.showModal();
      dialog.querySelector('form[method="dialog"] button').focus({preventScroll: true});
    });
    dialog.addEventListener('close', () => {
      const audio = dialog.querySelector('audio');
      if (audio) audio.pause();
      link.focus({preventScroll: true});
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
  }
})();
