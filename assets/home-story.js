/* Light entrance and text effects, following ordinary document scrolling. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0, Math.min(1, value));
  const header = document.querySelector('.global-header');

  // 1 · The opening words give way as the page moves on.
  const night = document.querySelector('[data-night]');
  let nightFrame = 0;
  const paintNight = () => {
    nightFrame = 0;
    const out = reduced.matches ? 0 : clamp(scrollY / Math.max(1, night.offsetHeight * .9));
    night.style.setProperty('--night-out', out.toFixed(3));
  };

  function paintHeader() {
    header?.toggleAttribute('data-solid', scrollY > 16);
  }
  function onScroll() {
    if (night && !nightFrame) nightFrame = requestAnimationFrame(paintNight);
    paintHeader();
  }
  if (night) {
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    addEventListener('load', onScroll);
    reduced.addEventListener('change', onScroll);
  }

  // 2 · Words light up one after the other while the heading crosses the screen.
  const heading = document.querySelector('[data-story-words]');
  if (heading && !reduced.matches) {
    // Translate each complete sentence before the decorative word split.
    // Keep those source sentences across language changes.
    const sentences = [...heading.children].map(node => ({node, source: (window.AiforeuLanguage?.sourceText(node) || node.textContent).trim()}));
    heading.dataset.i18nIgnore = '';
    const words = [];
    const split = node => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === Node.ELEMENT_NODE) { split(child); continue; }
        if (child.nodeType !== Node.TEXT_NODE) continue;
        const pieces = document.createDocumentFragment();
        for (const part of child.textContent.split(/(\s+)/)) {
          if (!part.trim()) { pieces.append(part); continue; }
          const word = document.createElement('span');
          word.className = 'story-word'; word.textContent = part; words.push(word); pieces.append(word);
        }
        child.replaceWith(pieces);
      }
    };
    let wordsFrame = 0;
    const paint = () => {
      wordsFrame = 0;
      const box = heading.getBoundingClientRect();
      // Starts as the heading enters from below, complete once it has reached the upper third.
      const read = clamp((innerHeight * .9 - box.top) / (innerHeight * .56));
      words.forEach((word, index) => { word.style.opacity = (.2 + .8 * clamp(read * (words.length + 1.5) - index)).toFixed(3); });
    };
    const schedule = () => { if (!wordsFrame) wordsFrame = requestAnimationFrame(paint); };
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    const rebuild = () => {
      words.length = 0;
      for (const sentence of sentences) {
        sentence.node.textContent = window.AiforeuLanguage?.t(sentence.source, 'de') || sentence.source;
        split(sentence.node);
      }
      paint();
    };
    addEventListener('aiforeu:language-ready', rebuild);
    if (window.AiforeuLanguage?.ready) rebuild();
  }

})();
