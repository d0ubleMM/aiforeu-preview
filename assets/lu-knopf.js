/* AIFOREU · Bewegung · Knöpfe: rollende Beschriftung, Pfeil-Wechsel, Farbfüllung vom Zeiger aus, leichter Zug zum Zeiger.
   Ziel: .bp-button, .landing-button, .global-contact, .button. Der zugängliche Name bleibt der Originaltext. */
(() => {
  'use strict';
  const reduziert = matchMedia('(prefers-reduced-motion: reduce)');
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || reduziert.matches) return;
  const hell = farbe => { const m = farbe.match(/[\d.]+/g); if (!m || (m[3] !== undefined && +m[3] < .3)) return true; const [r, g, b] = m.map(Number); return (r * 299 + g * 587 + b * 114) / 1000 > 150; };
  for (const k of document.querySelectorAll('.bp-button, .landing-button, .global-contact, a.button, button.button')) {
    if (k.classList.contains('lu-k')) continue;
    const original = k.cloneNode(true);
    original.querySelectorAll('[aria-hidden="true"]').forEach(n => n.remove());
    if (!k.hasAttribute('aria-label')) k.setAttribute('aria-label', original.textContent.replace(/\s+/g, ' ').trim());
    const text = [...k.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim());
    if (text) {
      const wort = text.nodeValue.trim(), vorn = text.nodeValue.match(/^\s*/)[0], hinten = text.nodeValue.match(/\s*$/)[0];
      const huelle = document.createElement('span'); huelle.className = 'lu-k-text';
      const roll = document.createElement('span'); roll.className = 'lu-k-roll'; roll.dataset.luText = wort; roll.textContent = wort; huelle.append(roll);
      const frag = document.createDocumentFragment(); if (vorn) frag.append(vorn); frag.append(huelle); if (hinten) frag.append(hinten); text.replaceWith(frag);
    }
    const pfeil = [...k.children].find(c => c.getAttribute('aria-hidden') === 'true' && c.tagName !== 'LU-FUELL');
    if (pfeil) {
      const z = pfeil.textContent.trim(), pf = document.createElement('lu-pf'); pf.setAttribute('aria-hidden', 'true');
      pf.dataset.richtung = z === '→' ? 'quer' : z === '↓' ? 'runter' : 'schraeg';
      pfeil.replaceWith(pf); pf.append(pfeil, pfeil.cloneNode(true));
    }
    const fuell = document.createElement('lu-fuell'); fuell.setAttribute('aria-hidden', 'true'); k.prepend(fuell);
    const bg = getComputedStyle(k).backgroundColor;
    if (hell(bg)) { k.classList.add('lu-k--hell'); k.style.setProperty('--lu-fuell', '#1f2937'); }
    k.classList.add('lu-k');
    let rahmen = null;
    k.addEventListener('pointerenter', e => {
      if (reduziert.matches) return;
      rahmen = k.getBoundingClientRect(); k.classList.add('lu-k--zug');
      fuell.style.transition = 'none'; fuell.style.left = (e.clientX - rahmen.left) + 'px'; fuell.style.top = (e.clientY - rahmen.top) + 'px';
      k.style.setProperty('--lu-fuell-s', (Math.hypot(rahmen.width, rahmen.height) / 5 + 2).toFixed(1));
      fuell.getBoundingClientRect(); fuell.style.transition = '';
    });
    k.addEventListener('pointermove', e => {
      if (!rahmen || reduziert.matches) return;
      const dx = (e.clientX - (rahmen.left + rahmen.width / 2)) / (rahmen.width / 2), dy = (e.clientY - (rahmen.top + rahmen.height / 2)) / (rahmen.height / 2);
      k.style.translate = `${(dx * 6).toFixed(1)}px ${(dy * 4).toFixed(1)}px`;
    });
    k.addEventListener('pointerleave', e => {
      if (rahmen) { fuell.style.left = (e.clientX - rahmen.left) + 'px'; fuell.style.top = (e.clientY - rahmen.top) + 'px'; }
      rahmen = null; k.classList.remove('lu-k--zug'); k.style.translate = '';
    });
    reduziert.addEventListener('change', () => {
      if (reduziert.matches) { rahmen = null; k.classList.remove('lu-k--zug'); k.style.translate = ''; }
    });
  }
})();
