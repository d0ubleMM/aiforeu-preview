// Alle Seiten: Menü am Handy, Platzhalter-Schalter, Einblenden beim Scrollen, kleine Produktszenen.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mk = $('.menue-knopf'), nav = $('#hauptnav');
  const zu = () => { nav.classList.remove('offen'); mk.setAttribute('aria-expanded', 'false'); };
  mk?.addEventListener('click', () => { const o = mk.getAttribute('aria-expanded') !== 'true'; mk.setAttribute('aria-expanded', o); nav.classList.toggle('offen', o); });
  nav?.addEventListener('click', e => { if (e.target.closest('a')) zu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav?.classList.contains('offen')) { zu(); mk.focus(); } });

  const pz = $('#platzhalter');
  if (!$('[data-ph],[data-platzhalter]')) pz?.remove();
  pz?.addEventListener('click', () => {
    const an = pz.getAttribute('aria-pressed') !== 'true';
    pz.setAttribute('aria-pressed', an); pz.textContent = an ? 'Platzhalter ausblenden' : 'Platzhalter zeigen';
    document.documentElement.classList.toggle('zeige-platzhalter', an);
    if (an) setTimeout(() => $('[data-ph],[data-platzhalter]')?.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' }), 60);
  });

  const io = 'IntersectionObserver' in window && !RM ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('da'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' }) : null;
  $$('.zeigen').forEach(el => io ? io.observe(el) : el.classList.add('da'));

  // Szene: Zustände laufen nacheinander durch, solange die Szene sichtbar ist (Voice: Anruf, IVE: Sitzungen).
  // data-zustaende="wert:Text|wert:Text" je Element, versetzt um die Position.
  $$('[data-szene]').forEach(sz => {
    const els = $$('[data-zustaende]', sz);
    let uhr = null, n = 0;
    const takt = () => {
      n++;
      els.forEach((el, i) => {
        const z = el.dataset.zustaende.split('|'), [wert, text] = z[(n + i) % z.length].split(':');
        el.dataset.z = wert; if (text) el.textContent = text;
      });
    };
    if (RM) return takt();
    new IntersectionObserver(es => {
      if (es[0].isIntersecting) { if (!uhr) { takt(); uhr = setInterval(takt, 1700); } }
      else { clearInterval(uhr); uhr = null; }
    }).observe(sz);
  });
})();
