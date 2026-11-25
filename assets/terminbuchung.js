(() => {
  'use strict';
  const section = document.querySelector('[data-terminbuchung]');
  if (!section) return;
  const open = section.querySelector('[data-terminwahl]');
  const alternate = section.querySelector('[data-buchungslink]');
  const frame = section.querySelector('iframe');

  function setLanguage() {
    const language = document.documentElement.lang || 'de';
    const url = new URL(open.href);
    url.searchParams.set('lang', language);
    url.searchParams.set('hl', language);
    open.href = url.href;
    alternate.href = url.href;
    return url;
  }

  open.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const url = setLanguage();
    frame.src = url.href;
    frame.hidden = false;
    alternate.hidden = false;
    open.hidden = true;
    frame.focus();
  });
  window.addEventListener('aiforeu:language-ready', () => {
    const url = setLanguage();
    if (!frame.hidden && frame.src !== url.href) frame.src = url.href;
  });
  setLanguage();
})();
