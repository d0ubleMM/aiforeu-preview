/* AIFOREU · Landing · Bildbewegung im Hero
 *
 * Die Bewegung selbst steht in landing-motion.css (einmaliges Aufziehen des Straßenbildes, 7 s).
 * Dieses Skript steuert sie nur: wartet auf das Bild, hält an, wenn der Hero nicht zu sehen ist oder
 * der Tab im Hintergrund liegt, und bedient den Knopf (Anhalten, Fortsetzen, nach dem Ende Wiederholen).
 * Zustand am Hero: data-landing-motion = playing | paused | rewind | done | off.
 * Text und Überschrift fasst es nicht an. Bei reduzierter Bewegung und mit ?motion=off: keine Animation.
 * Einbau und Grenzen: docs/LANDING-MOTION.md
 */
(() => {
  'use strict';

  const ATTR = 'data-landing-motion';
  const hero = document.querySelector('.landing-page [data-landing-hero]');
  if (!hero || hero.hasAttribute(ATTR)) return;
  const image = hero.querySelector('[data-landing-image]');
  const toggle = hero.querySelector('[data-landing-motion-toggle]');
  if (!image) return;
  // Ohne das zugehörige Stylesheet gibt es nichts zu steuern; der Knopf bleibt dann verborgen.
  if (getComputedStyle(hero).getPropertyValue('--landing-motion').trim() !== '1') return;

  let wish = null;
  try { wish = new URLSearchParams(window.location.search).get('motion'); } catch (error) { /* ohne Wunsch weiter */ }
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  const PULL = 'landing-pull';
  const REWIND = 'landing-rewind';
  const UI = {
    playing: ['Ⅱ', 'Bildbewegung pausieren'],
    paused: ['▶︎', 'Bildbewegung fortsetzen'],
    done: ['↻', 'Bildbewegung noch einmal abspielen'],
  };

  let state = 'new';
  let rewinding = false;
  let pageHidden = false;
  let userPaused = false;                                   // vom Menschen angehalten
  let inView = !('IntersectionObserver' in window);
  let imageFailed = image.complete && image.naturalWidth === 0;
  let ready = image.complete && image.naturalWidth > 0;     // Bild geladen

  function setState(next) {
    state = next;
    hero.setAttribute(ATTR, next);
    if (!toggle) return;
    // Der Knopf zeigt die Absicht: hält die Seite nur von selbst an, bleibt es beim Pausenzeichen.
    const key = next === 'rewind' || (next === 'paused' && !userPaused) ? 'playing' : next;
    const ui = UI[key];
    toggle.hidden = !ui;
    if (!ui) return;
    toggle.textContent = ui[0];
    toggle.setAttribute('aria-label', ui[1]);
    toggle.title = ui[1];
  }

  // Spielt nur, wenn das Bild da ist, der Hero zu sehen ist und niemand angehalten hat.
  function sync() {
    if (!['playing', 'paused', 'rewind'].includes(state)) return;
    setState(ready && inView && !document.hidden && !pageHidden && !userPaused ? (rewinding ? 'rewind' : 'playing') : 'paused');
  }

  function replay() {
    userPaused = false;
    rewinding = true;
    hero.setAttribute('data-landing-rewinding', 'true');
    setState('rewind');
    sync();
  }

  function listen() {
    image.addEventListener('animationend', event => {
      if (event.animationName === PULL && (state === 'playing' || state === 'paused')) setState('done');
      else if (event.animationName === REWIND && rewinding) {
        rewinding = false;
        hero.removeAttribute('data-landing-rewinding');
        setState('playing'); sync();
      }
    });
    if (!ready) {
      image.addEventListener('load', () => { ready = true; sync(); }, { once: true });
      image.addEventListener('error', () => { imageFailed = true; setState('off'); }, { once: true });
    }
    if (toggle) {
      toggle.addEventListener('click', () => {
        if (state === 'done') replay();
        else if (['playing', 'paused', 'rewind'].includes(state)) {
          userPaused = !userPaused;
          if (!userPaused) inView = true;
          sync();
        }
      });
    }
    if ('IntersectionObserver' in window) {
      let observer;
      const observeHero = () => {
        if (observer) observer.disconnect();
        // Auch bei niedrigen Fenstern oder starkem Zoom muss der Hero als sichtbar gelten können.
        const height = Math.max(1, hero.getBoundingClientRect().height);
        const startAt = Math.min(0.35, Math.max(0.001, window.innerHeight * 0.5 / height));
        const stopAt = Math.min(0.1, startAt * 0.4);
        observer = new IntersectionObserver(entries => {
          const ratio = entries[entries.length - 1].intersectionRatio;
          if (ratio >= startAt) inView = true;
          else if (ratio < stopAt) inView = false;
          sync();
        }, { threshold: [0, stopAt, startAt, 1] });
        observer.observe(hero);
      };
      observeHero();
      window.addEventListener('resize', observeHero);
    }
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', () => { pageHidden = true; sync(); });
    window.addEventListener('pageshow', () => { pageHidden = false; sync(); });
    window.addEventListener('beforeprint', () => { if (state !== 'off') setState('done'); });
    const onCalm = () => {
      if (wish === 'off') return;
      if (calm.matches) setState('off');
      else if (state === 'off' && !imageFailed) setState('done');
    };
    if (typeof calm.addEventListener === 'function') calm.addEventListener('change', onCalm);
    else if (typeof calm.addListener === 'function') calm.addListener(onCalm);
  }

  function init() {
    listen();
    if (imageFailed || calm.matches || wish === 'off') { setState('off'); return; }
    setState('playing');
    sync();
  }

  try {
    init();
  } catch (error) {
    hero.setAttribute(ATTR, 'off');
    state = 'off';
    if (toggle) toggle.hidden = true;
  }

  // Kleine Schnittstelle für die Abnahme.
  window.AiforeuLandingMotion = {
    get state() { return state; },
    replay() { if (state !== 'off' && state !== 'rewind') replay(); },
    pause() { if (['playing', 'paused', 'rewind'].includes(state)) { userPaused = true; sync(); } },
    play() { if (state === 'done') replay(); else { userPaused = false; inView = true; sync(); } },
  };
})();
