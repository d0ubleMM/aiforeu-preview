/* AIFOREU · Bewegung · Lader der Startseite. Zeigt einen Zähler von 000 bis 100, bis die Eröffnungsszene
   gezeichnet ist oder ihre statische Fassung zeigt. Die Stadt weiter unten ist kein Ladehindernis.
   Mindestens 0,9 s; nach 4 s wird die Freigabe erzwungen. Nur beim ersten Aufruf je Sitzung.
   Setzt html.lu-laedt, danach html.lu-offen,
   und meldet 'lu:offen' an document. */
(() => {
  'use strict';
  const html = document.documentElement;
  const bewegung = matchMedia('(prefers-reduced-motion: reduce)');
  const oeffne = () => { html.classList.remove('lu-laedt'); html.classList.add('lu-offen'); document.dispatchEvent(new CustomEvent('lu:offen')); };
  let gesehen = false; try { gesehen = sessionStorage.getItem('lu-lader') === '1'; } catch (fehler) { /* ohne Speicher jedes Mal */ }
  if (gesehen || bewegung.matches || !document.body) { oeffne(); return; }
  try { sessionStorage.setItem('lu-lader', '1'); } catch (fehler) { /* egal */ }
  html.classList.add('lu-laedt');
  const lader = document.createElement('div'); lader.className = 'lu-lader'; lader.setAttribute('role', 'status'); lader.setAttribute('aria-label', 'Seite lädt');
  lader.innerHTML = '<div class="lu-lader-mitte"><img src="assets/aiforeu-mark.svg" alt="" width="54" height="36"></div><div class="lu-lader-fuss"><span class="lu-lader-zahl" aria-hidden="true">000</span><span class="lu-lader-wort" aria-hidden="true">AIFOREU · Osnabrück &amp; Berlin</span></div><i class="lu-lader-linie" aria-hidden="true"></i>';
  document.body.append(lader);
  const zahl = lader.querySelector('.lu-lader-zahl'), linie = lader.querySelector('.lu-lader-linie');
  const start = performance.now(); let ziel = 12, wert = 0, fertig = false, zu = false, zuletzt = start;
  let beobachter = null, bildId = 0, schlussTimer = 0;
  const hoch = n => { ziel = Math.max(ziel, n); };
  if (document.readyState !== 'loading') hoch(35); else document.addEventListener('DOMContentLoaded', () => hoch(35));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => hoch(55));
  addEventListener('load', () => hoch(70));
  const eroeffnung = document.querySelector('[data-connection-story][data-connection-opening]') || document.querySelector('[data-connection-story]');
  const buehne = eroeffnung || document.querySelector('[data-world-stage]');
  const szeneBereit = () => { hoch(100); fertig = true; beobachter?.disconnect(); };
  const istBereit = () => eroeffnung
    ? ['ready', 'fallback'].includes(eroeffnung.getAttribute('data-connection-state'))
    : buehne?.hasAttribute('data-world-ready');
  if (!buehne) {
    if (document.readyState === 'complete') szeneBereit();
    else addEventListener('load', szeneBereit, { once: true });
  } else if (istBereit()) szeneBereit();
  else {
    beobachter = new MutationObserver(() => { if (istBereit()) szeneBereit(); });
    beobachter.observe(buehne, { attributes: true, attributeFilter: [eroeffnung ? 'data-connection-state' : 'data-world-ready'] });
  }
  function bild(jetzt) {
    const t = jetzt - start;
    if (t > 4000) { ziel = 100; fertig = true; }
    const decke = fertig && t > 900 ? 100 : Math.min(ziel, 94);
    const dt = Math.min(.1, (jetzt - zuletzt) / 1000); zuletzt = jetzt;
    wert += (decke - wert) * (1 - Math.exp(-dt * (decke >= 100 ? 11 : 3.2))); if (decke - wert < .5) wert = decke;
    const n = Math.round(wert);
    zahl.textContent = String(n).padStart(3, '0'); linie.style.transform = `scaleX(${(wert / 100).toFixed(4)})`;
    if (n >= 100 && !zu) { zu = true; schlussTimer = setTimeout(schliesse, 180); return; }
    if (!zu) bildId = requestAnimationFrame(bild);
  }
  function schliesse() {
    beobachter?.disconnect();
    lader.classList.add('lu-lader--auf'); oeffne();
    setTimeout(() => lader.remove(), 900);
  }
  const sofortOeffnen = () => {
    zu = true; cancelAnimationFrame(bildId); clearTimeout(schlussTimer); beobachter?.disconnect();
    lader.remove(); oeffne();
  };
  bildId = requestAnimationFrame(bild);
  bewegung.addEventListener('change', () => { if (bewegung.matches) sofortOeffnen(); });
  addEventListener('pageshow', e => { if (e.persisted) sofortOeffnen(); });
})();
