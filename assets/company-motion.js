/* AIFOREU · Startseite · Hero-Szene in Bewegung
 *
 * Erzählt in gut sechs Sekunden, was die Szene zeigt:
 *   1 Anfrage       die Kundenanfrage kommt von außen ins Bild
 *   2 Einordnen     worum es geht, wird markiert; AIFOREU nimmt die Anfrage auf
 *   3 Vorbereiten   Übergabe über die drei Punkte, die Antwortkarte füllt sich
 *   4 Ihre Prüfung  der Blick landet bei „Sie behalten das letzte Wort.“
 *
 * Läuft einmal, sobald die Szene sichtbar ist, und endet im unveränderten Entwurf aus home.css.
 * Ohne dieses Skript, bei reduzierter Bewegung oder nach einem Fehler steht die Szene sofort fertig da.
 * Keine Abhängigkeiten und keine Timer: der Ablauf besteht aus Web-Animationen, die sich anhalten lassen.
 * Gehört zu company-motion.css. Einbau, Prüfhilfen und Grenzen: docs/MOTION-HANDOFF.md
 */
(() => {
  'use strict';

  const scene = document.querySelector('.work-scene');
  if (!scene || scene.hasAttribute('data-motion')) return;
  // Ohne das zugehörige Stylesheet bleibt alles, wie es ist.
  if (getComputedStyle(scene).getPropertyValue('--cm').trim() !== '1') return;

  const one = selector => scene.querySelector(selector);
  const all = selector => Array.from(scene.querySelectorAll(selector));
  const el = {
    top: one('.scene-top'),
    time: one('.scene-time'),
    orbits: all('.scene-orbit'),
    note: one('.incoming-note'),
    noteIcon: one('.incoming-note .note-icon'),
    noteText: one('.incoming-note p'),
    dots: all('.scene-connector span'),
    tile: one('.brand-tile'),
    tileMark: one('.brand-tile img'),
    result: one('.result-note'),
    tick: one('.result-note .tick'),
    headline: one('.result-heading > span:nth-child(2)'),
    rows: all('.result-row'),
    approval: one('.approval-line'),
    avatar: one('.approval-line .avatar'),
    arrow: one('.approval-line > span:last-child'),
  };

  const capable = Boolean(el.note && el.tile && el.result) &&
    typeof scene.animate === 'function' &&
    typeof CSS !== 'undefined' && typeof CSS.supports === 'function' &&
    CSS.supports('translate', '1px 1px') && CSS.supports('rotate', '1deg') && CSS.supports('scale', '1 1');
  if (!capable) { scene.setAttribute('data-motion', 'off'); return; }

  // Nur für die Abnahme: ?motion=off | slow | <Millisekunden>
  let wish = null;
  try { wish = new URLSearchParams(window.location.search).get('motion'); } catch (error) { /* ohne Wunsch weiter */ }

  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Kam das Skript so spät, dass die Szene schon sichtbar steht, wird sie nicht noch einmal geleert.
  const late = typeof performance !== 'undefined' && performance.now() > 2400;

  const BEATS = [
    { name: 'Anfrage', at: 0 },
    { name: 'Einordnen', at: 1400 },
    { name: 'Vorbereiten', at: 2850 },
    { name: 'Ihre Prüfung', at: 4850 },
  ];
  const END = 6450;
  const EASE = {
    out: 'cubic-bezier(.16,1,.3,1)',     // kommt an und beruhigt sich
    soft: 'cubic-bezier(.3,.7,.2,1)',
    swing: 'cubic-bezier(.65,0,.35,1)',  // löst sich und setzt wieder auf
  };
  const LABELS = {
    pause: 'Animation anhalten',
    play: 'Animation fortsetzen',
    start: 'Animation abspielen',
    replay: 'Animation noch einmal abspielen',
  };

  let anims = [];           // alle Animationen des laufenden Durchgangs
  let state = 'new';        // idle · playing · paused · done · static · off
  let userPaused = false;   // vom Menschen angehalten (bleibt über Scrollen und Tabwechsel bestehen)
  let inView = !('IntersectionObserver' in window);
  let run = 0;              // macht Ende-Meldungen alter Durchgänge ungültig
  let deco = null;          // vom Skript angelegtes Beiwerk
  let control = null;
  const rate = wish === 'slow' ? 0.3 : 1;

  /* ---------- Zustand ---------- */

  function setState(next) {
    state = next;
    scene.setAttribute('data-motion', next);
    if (!control) return;
    let mode = 'play';
    if (next === 'done') mode = 'replay';
    else if (next === 'playing' || (next === 'idle' && !userPaused)) mode = 'pause';
    const label = mode === 'play' && next === 'idle' ? LABELS.start : LABELS[mode];
    control.setAttribute('data-state', mode);
    control.setAttribute('aria-label', label);
    control.title = label;
  }

  function clear() {
    anims.forEach(anim => {
      anim.onfinish = null;
      try { anim.cancel(); } catch (error) { /* schon beendet */ }
    });
    anims = [];
  }

  /* ---------- Beiwerk: Marker, Ringe, Schrittzeile, Bedienknopf ---------- */

  function markWord(root, word) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement && node.parentElement.closest('.cm-key')) continue;
      const index = node.nodeValue.indexOf(word);
      if (index < 0) continue;
      const hit = node.splitText(index);
      hit.splitText(word.length);
      const key = document.createElement('span');
      key.className = 'cm-key';
      hit.parentNode.insertBefore(key, hit);
      key.append(hit);
      const mark = document.createElement('i');
      mark.className = 'cm-mark';
      mark.setAttribute('aria-hidden', 'true');
      key.append(mark);
      return mark;
    }
    return null;
  }

  function ring(host) {
    const node = document.createElement('i');
    node.className = 'cm-ping';
    node.setAttribute('aria-hidden', 'true');
    host.append(node);
    return node;
  }

  function mountControl() {
    // Vier Kreisbögen, einer je Schritt; Radius, Mittelpunkt und Lücke in Grad.
    const R = 17, C = 19, GAP = 9;
    const point = degrees => {
      const angle = (degrees - 90) * Math.PI / 180;
      return (C + R * Math.cos(angle)).toFixed(2) + ' ' + (C + R * Math.sin(angle)).toFixed(2);
    };
    let arcs = '';
    for (let i = 0; i < 4; i++) {
      const d = 'M' + point(i * 90 + GAP / 2) + 'A' + R + ' ' + R + ' 0 0 1 ' + point((i + 1) * 90 - GAP / 2);
      arcs += '<path class="cm-track" d="' + d + '"/><path class="cm-arc" d="' + d + '"/>';
    }
    control = document.createElement('button');
    control.type = 'button';
    control.className = 'cm-control';
    control.innerHTML =
      '<svg class="cm-ring" viewBox="0 0 38 38" aria-hidden="true" focusable="false">' + arcs + '</svg>' +
      '<svg class="cm-icon cm-icon-pause" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="4.2" y="3.6" width="2.6" height="8.8" rx=".9"/><rect x="9.2" y="3.6" width="2.6" height="8.8" rx=".9"/></svg>' +
      '<svg class="cm-icon cm-icon-play" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M5.4 3.6v8.8a.6.6 0 0 0 .92.5l6.6-4.4a.6.6 0 0 0 0-1L6.32 3.1a.6.6 0 0 0-.92.5z"/></svg>' +
      '<svg class="cm-icon cm-icon-replay" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M12.4 8a4.4 4.4 0 1 1-1.5-3.3L11.4 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M11.4 2v3h-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    deco.arcs = Array.from(control.querySelectorAll('.cm-arc'));
    deco.arcLength = (R * (90 - GAP) * Math.PI / 180).toFixed(2);
    control.addEventListener('click', onControl);
    if (el.time) el.time.append(control);
    else { control.classList.add('cm-control--float'); scene.append(control); }
  }

  function decorate() {
    if (deco) return;
    deco = { marks: [], beats: [], arcs: [], arcLength: '0', tilePing: null, avatarPing: null };
    const words = (scene.getAttribute('data-motion-keys') || 'Termin,Donnerstag')
      .split(',').map(word => word.trim()).filter(Boolean);
    if (el.noteText) {
      words.forEach(word => {
        const mark = markWord(el.noteText, word);
        if (mark) deco.marks.push(mark);
      });
    }
    deco.tilePing = ring(el.tile);
    if (el.avatar) deco.avatarPing = ring(el.avatar);
    if (el.top) {
      const line = document.createElement('span');
      line.className = 'cm-beat';
      line.setAttribute('aria-hidden', 'true');
      BEATS.forEach((beat, i) => {
        const item = document.createElement('span');
        const number = document.createElement('b');
        number.textContent = '0' + (i + 1);
        item.append(number, beat.name);
        line.append(item);
        deco.beats.push(item);
      });
      el.top.append(line);
    }
    mountControl();
  }

  /* ---------- Ablauf ---------- */

  // Legt eine Animation an und hält sie am Anfang fest. Vor ihrem Einsatz zeigt sie ihr erstes Bild
  // (fill: backwards), nach dem Ende gilt wieder der Entwurf aus dem Stylesheet.
  function add(target, frames, at, duration, more) {
    if (!target) return null;
    const anim = target.animate(frames, Object.assign({ delay: at, duration, fill: 'backwards', easing: 'linear' }, more));
    anim.pause();
    if (rate !== 1) anim.playbackRate = rate;
    anim.cmEnd = at + duration;
    anims.push(anim);
    return anim;
  }

  function build() {
    clear();
    decorate();
    const ORG = BEATS[1].at, PREP = BEATS[2].at, CHECK = BEATS[3].at;
    const still = '0px 0px';

    // Raum: die beiden Bahnen kommen einmal zur Ruhe.
    add(el.orbits[0], [{ rotate: '5deg', scale: '1.04' }, { rotate: '0deg', scale: '1' }], 0, 3000, { easing: EASE.out });
    add(el.orbits[1], [{ rotate: '-4deg', scale: '1.03' }, { rotate: '0deg', scale: '1' }], 0, 3600, { easing: EASE.out });

    // 1 · Anfrage: die Notiz kommt von außen ins Bild.
    add(el.note, [{ opacity: 0 }, { opacity: 1 }], 160, 320, { easing: 'ease-out' });
    add(el.note, [
      { translate: '-52px 12px', rotate: '-4deg', scale: '.97' },
      { translate: still, rotate: '0deg', scale: '1' },
    ], 160, 940, { easing: EASE.out });
    add(el.noteIcon, [{ opacity: 0, scale: '.6' }, { opacity: 1, scale: '1' }], 600, 500, { easing: EASE.out });

    // 2 · Einordnen: worum es geht, wird markiert; dann nimmt AIFOREU die Anfrage auf.
    deco.marks.forEach((mark, i) => {
      const at = ORG + i * 280;
      const span = END - 470 - at;
      add(mark, [
        { opacity: 1, scale: '0 1', offset: 0, easing: EASE.out },
        { opacity: 1, scale: '1 1', offset: 440 / span },
        { opacity: 1, scale: '1 1', offset: 1 - 460 / span, easing: 'ease-in' },
        { opacity: 0, scale: '1 1', offset: 1 },
      ], at, span);
    });
    add(el.note, [
      { translate: still, easing: 'ease-out' },
      { translate: '0px 6px', offset: 0.42, easing: 'ease-in-out' },
      { translate: still },
    ], ORG + 590, 580, { fill: 'none' });
    add(el.tile, [{ opacity: 0 }, { opacity: 1 }], ORG + 560, 240, { easing: 'ease-out' });
    add(el.tile, [
      { scale: '.55', rotate: '-12deg', translate: '0px 14px', easing: EASE.out },
      { scale: '1.07', rotate: '2deg', translate: '0px -2px', offset: 0.6, easing: EASE.swing },
      { scale: '1', rotate: '0deg', translate: still },
    ], ORG + 560, 780);
    add(el.tileMark, [{ scale: '.6' }, { scale: '1' }], ORG + 680, 640, { easing: EASE.out });
    add(deco.tilePing, [{ opacity: 0.5, scale: '1' }, { opacity: 0, scale: '1.6' }], ORG + 1000, 900, { fill: 'none', easing: EASE.out });

    // 3 · Vorbereiten: Übergabe über die drei Punkte, dann füllt sich die Antwort Zeile für Zeile.
    el.dots.forEach((dot, i) => add(dot, [
      { opacity: 0.22, scale: '1', easing: EASE.out },
      { opacity: 1, scale: '1.9', offset: 0.42, easing: EASE.swing },
      { opacity: 1, scale: '1' },
    ], PREP + i * 140, 520));
    add(el.result, [{ opacity: 0 }, { opacity: 1 }], PREP + 380, 320, { easing: 'ease-out' });
    add(el.result, [
      { translate: '16px 28px', rotate: '2.5deg', scale: '.965' },
      { translate: still, rotate: '0deg', scale: '1' },
    ], PREP + 380, 960, { easing: EASE.out });
    el.rows.forEach((row, i) => {
      const at = PREP + 800 + i * 320;
      add(row.firstElementChild, [{ opacity: 0, translate: '0px 6px' }, { opacity: 1, translate: still }], at, 380, { easing: EASE.out });
      add(row.querySelector('strong'), [
        { clipPath: 'inset(-4px 100% -4px -4px)' },
        { clipPath: 'inset(-4px -4px -4px -4px)' },
      ], at + 90, 540, { easing: EASE.soft });
    });
    add(el.headline, [{ opacity: 0.45 }, { opacity: 1 }], PREP + 1480, 360, { easing: 'ease-out' });
    add(el.tick, [
      { scale: '0', rotate: '-40deg', easing: EASE.out },
      { scale: '1.2', rotate: '0deg', offset: 0.6, easing: EASE.swing },
      { scale: '1', rotate: '0deg' },
    ], PREP + 1480, 520);

    // 4 · Ihre Prüfung: die Karte kommt einen Schritt entgegen, der Blick landet beim Menschen.
    add(el.approval, [{ opacity: 0, translate: '0px 8px' }, { opacity: 1, translate: still }], CHECK + 60, 480, { easing: EASE.out });
    add(el.result, [
      { translate: still, easing: 'ease-out' },
      { translate: '0px -5px', offset: 0.45, easing: 'ease-in-out' },
      { translate: still },
    ], CHECK + 200, 900, { fill: 'none' });
    add(el.avatar, [{ scale: '.6' }, { scale: '1' }], CHECK + 220, 460, { easing: EASE.out });
    add(deco.avatarPing, [
      { opacity: 0, scale: '1', offset: 0, easing: EASE.out },
      { opacity: 1, scale: '1.38', offset: 0.26 },
      { opacity: 1, scale: '1.38', offset: 0.72, easing: 'ease-in' },
      { opacity: 0, scale: '1.5', offset: 1 },
    ], CHECK + 480, END - CHECK - 480, { fill: 'none' });
    add(el.arrow, [
      { translate: still, easing: 'ease-out' },
      { translate: '3px -3px', offset: 0.45, easing: 'ease-in-out' },
      { translate: still },
    ], CHECK + 650, 620, { fill: 'none' });

    // Schrittzeile und Ring am Bedienknopf laufen im selben Takt mit.
    BEATS.forEach((beat, i) => {
      const from = beat.at;
      const span = (i < BEATS.length - 1 ? BEATS[i + 1].at : END) - from;
      add(deco.beats[i], [
        { opacity: 0, translate: '0px 5px', offset: 0, easing: EASE.out },
        { opacity: 1, translate: still, offset: 260 / span },
        { opacity: 1, translate: still, offset: 1 - 200 / span, easing: 'ease-in' },
        { opacity: 0, translate: '0px -4px', offset: 1 },
      ], from, span, { fill: 'none' });
      add(deco.arcs[i], [
        { strokeDasharray: '0 ' + deco.arcLength },
        { strokeDasharray: deco.arcLength + ' ' + deco.arcLength },
      ], from, span);
    });

    // Das Ende meldet die Animation, die zuletzt fertig wird.
    const id = ++run;
    const last = anims.reduce((a, b) => (b.cmEnd > a.cmEnd ? b : a));
    last.onfinish = () => { if (id === run) done(); };
  }

  function play() {
    if (state !== 'idle' && state !== 'paused') return;
    setState('playing');
    anims.slice().forEach(anim => {
      if (anim.playState !== 'paused') return;
      // Was (nach einem Sprung) schon hinter seinem Ende steht, würde sonst von vorn beginnen.
      if ((Number(anim.currentTime) || 0) >= anim.cmEnd) anim.finish(); else anim.play();
    });
  }

  function pause() {
    if (state !== 'playing') return;
    anims.forEach(anim => { if (anim.playState === 'running') anim.pause(); });
    setState('paused');
  }

  function done() {
    clear();
    setState('done');
  }

  function finish() {
    clear();
    run += 1;
    setState(calm.matches ? 'static' : 'done');
  }

  // Spielt nur, wenn die Szene zu sehen ist; hält an, wenn nicht.
  function sync() {
    const visible = inView && !document.hidden;
    if (!visible) pause();
    else if (!userPaused) play();
  }

  function replay() {
    if (state === 'static' || state === 'off') return;
    userPaused = false;
    if (state !== 'done') { build(); setState('idle'); sync(); return; }
    // Aus dem fertigen Bild heraus: kurz zusammennehmen, dann von vorn.
    clear();
    const id = ++run;
    const leave = (node, frames) => {
      const anim = node.animate(frames, { duration: 230, easing: 'ease-in', fill: 'forwards' });
      if (rate !== 1) anim.playbackRate = rate;
      anim.cmEnd = 230;
      anims.push(anim);
    };
    [el.note, el.tile, el.result].forEach(node => leave(node, [{ opacity: 1, scale: '1' }, { opacity: 0, scale: '.975' }]));
    deco.arcs.forEach(arc => leave(arc, [{ opacity: 1 }, { opacity: 0 }]));
    anims[anims.length - 1].onfinish = () => {
      if (id !== run) return;
      build();
      setState('idle');
      sync();
    };
    setState('playing');
  }

  // Für die Abnahme: an eine Stelle springen und dort stehen bleiben.
  function seek(ms) {
    if (state === 'static' || state === 'off' || calm.matches) return;
    build();
    anims.forEach(anim => { anim.currentTime = Math.max(0, ms); });
    userPaused = true;
    setState('paused');
  }

  /* ---------- Bedienung ---------- */

  // Spürbare Antwort auf die Betätigung: der Knopf gibt nach und federt zurück.
  function press() {
    if (!control || calm.matches) return;
    control.animate([{ scale: '.86' }, { scale: '1.07', offset: 0.55 }, { scale: '1' }], { duration: 340, easing: EASE.soft });
    if (state !== 'done') return;
    const icon = control.querySelector('.cm-icon-replay');
    if (icon) icon.animate([{ rotate: '0deg' }, { rotate: '360deg' }], { duration: 560, easing: EASE.out });
  }

  function onControl() {
    press();
    if (state === 'done') { inView = true; replay(); }
    else if (state === 'playing') { userPaused = true; pause(); }
    else if (state === 'paused') { userPaused = false; inView = true; sync(); }
    else if (state === 'idle') {
      userPaused = !userPaused;
      if (userPaused) setState('idle'); else { inView = true; sync(); }
    }
  }

  function listen() {
    if ('IntersectionObserver' in window) {
      let observer;
      const observeScene = () => {
        observer?.disconnect();
        // Large zoom and short windows must still be able to start the scene.
        const height = Math.max(1, scene.getBoundingClientRect().height);
        const startAt = Math.min(0.45, Math.max(0.001, window.innerHeight * 0.5 / height));
        const stopAt = Math.min(0.12, startAt * 0.4);
        observer = new IntersectionObserver(entries => {
          const ratio = entries[entries.length - 1].intersectionRatio;
          if (ratio >= startAt) inView = true;
          else if (ratio < stopAt) inView = false;
          sync();
        }, { threshold: [0, stopAt, startAt, 1] });
        observer.observe(scene);
      };
      observeScene();
      window.addEventListener('resize', observeScene);
    }
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('beforeprint', () => { if (state !== 'static' && state !== 'off') finish(); });
    const onCalm = () => {
      if (wish === 'off') return;
      if (calm.matches) { clear(); run += 1; setState('static'); }
      else if (state === 'static') { decorate(); setState('done'); }
    };
    if (typeof calm.addEventListener === 'function') calm.addEventListener('change', onCalm);
    else if (typeof calm.addListener === 'function') calm.addListener(onCalm);
  }

  function init() {
    listen();
    if (calm.matches || wish === 'off') { setState('static'); return; }
    if (wish && /^\d+$/.test(wish)) { setState('idle'); seek(Number(wish)); return; }
    if (late && wish !== 'slow') { decorate(); setState('done'); return; }
    build();
    setState('idle');
    sync();
  }

  try {
    init();
  } catch (error) {
    try { clear(); } catch (ignored) { /* nichts mehr zu räumen */ }
    scene.setAttribute('data-motion', 'off');
    state = 'off';
  }

  // Kleine Schnittstelle für Abnahme und Einbau, siehe docs/MOTION-HANDOFF.md
  window.AiforeuMotion = {
    play() { if (state === 'done') { inView = true; replay(); } else { userPaused = false; inView = true; sync(); } },
    pause() { userPaused = true; pause(); if (state === 'idle') setState('idle'); },
    replay() { inView = true; replay(); },
    finish() { if (state !== 'static' && state !== 'off') finish(); },
    seek(ms) { seek(Number(ms) || 0); },
    get state() { return state; },
  };
})();
