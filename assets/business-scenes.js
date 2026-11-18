/* Direct area and step selection, without pinned sections or scroll-driven state. */
(() => {
  'use strict';
  const root = document.querySelector('[data-business-scenes]');
  if (!root) return;
  const panels = [...root.querySelectorAll('[data-scene]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('.global-header');
  const steps = ['voice', 'desktop', 'workflows'];
  let area = 'agentario', step = 'voice', plan = 0, planTarget = 0;
  let paused = false, inView = false, model = null, loading = false, tween = 0;
  root.classList.add('is-interactive');

  function syncModel() {
    const moving = !paused && !reduced.matches && !document.hidden && !header?.hasAttribute('data-offers-open') && !document.body.classList.contains('global-menu-open');
    root.dataset.motion = String(moving);
    model?.update({plan, progress: .3 + plan * .45, active: inView && area === 'traffic', moving});
  }
  function setArea(value, animate = true) {
    const changed = area !== value;
    area = value; root.dataset.area = value;
    root.querySelectorAll('.business-nav [data-area]').forEach(link => {
      if (link.dataset.area === value) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    for (const panel of panels) {
      const inactive = panel.dataset.scene !== value;
      if (inactive && panel.contains(document.activeElement)) root.querySelector(`.business-nav [data-area="${value}"]`).focus({preventScroll: true});
      panel.hidden = inactive;
      if (!inactive && changed && animate && !reduced.matches) panel.animate([{opacity: 0, transform: 'translateY(8px)'}, {opacity: 1, transform: 'none'}], {duration: 260, easing: 'ease-out'});
    }
    if (value === 'traffic') loadModel();
    syncModel();
  }
  function setStep(value, animate = true) {
    step = value;
    const panel = root.querySelector('[data-scene="agentario"]');
    panel.dataset.step = value;
    root.style.setProperty('--agent-turn', steps.indexOf(value) / 2);
    root.querySelectorAll('[data-step-view]').forEach(view => {view.hidden = view.dataset.stepView !== value;});
    root.querySelectorAll('[data-step-select]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.stepSelect === value)));
    if (animate && !reduced.matches) root.querySelector(`[data-step-view="${value}"]`).animate([{opacity: .3, transform: 'translateY(8px)'}, {opacity: 1, transform: 'none'}], {duration: 260, easing: 'ease-out'});
  }
  function setPlan(value) {
    cancelAnimationFrame(tween);
    planTarget = value;
    root.querySelectorAll('[data-traffic-select]').forEach(button => button.setAttribute('aria-pressed', String((button.dataset.trafficSelect === 'plan') === !!value)));
    root.querySelector('[data-junction-label]').textContent = value ? 'Planebenen werden sichtbar' : 'Die Kreuzung im Zusammenhang';
    if (reduced.matches) {plan = value; syncModel(); return;}
    const start = performance.now(), from = plan;
    const paint = now => {
      const p = Math.min(1, (now - start) / 700), eased = p * p * (3 - 2 * p);
      plan = from + (value - from) * eased; syncModel();
      tween = p < 1 ? requestAnimationFrame(paint) : 0;
    };
    tween = requestAnimationFrame(paint);
  }
  root.querySelectorAll('[data-area]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const value = link.dataset.area;
    setArea(value); history.replaceState(null, '', value === 'traffic' ? '#traffic-scene' : '#agentario-scene');
    if (link.classList.contains('business-next')) root.scrollIntoView({block: 'start', behavior: reduced.matches ? 'instant' : 'smooth'});
  }));
  root.querySelectorAll('[data-step-select]').forEach(button => button.addEventListener('click', () => setStep(button.dataset.stepSelect)));
  root.querySelectorAll('[data-traffic-select]').forEach(button => button.addEventListener('click', () => setPlan(button.dataset.trafficSelect === 'plan' ? 1 : 0)));
  root.querySelector('[data-motion-toggle]').addEventListener('click', event => {
    paused = !paused;
    const button = event.currentTarget, label = paused ? 'Animation fortsetzen' : 'Animation pausieren';
    button.setAttribute('aria-pressed', String(paused)); button.setAttribute('aria-label', label); button.title = label;
    button.firstElementChild.textContent = paused ? '▷' : 'Ⅱ'; syncModel();
  });
  async function loadModel() {
    if (loading) return;
    loading = true;
    try {const {mountJunction} = await import('./business-junction.js?v=20261118-fluid'); model = mountJunction(root.querySelector('[data-junction]')); syncModel();}
    catch {root.dataset.junctionState = 'static';}
  }
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting; root.dataset.inView = String(inView); syncModel();
  }).observe(root);
  function followHash() {
    const hash = location.hash;
    if (hash === '#traffic-scene' || hash === '#platz-traffic') setArea('traffic', false);
    else if (hash === '#agentario-scene' || /^#platz-(voice|desktop|workflows)$/.test(hash)) {
      setArea('agentario', false); if (hash.startsWith('#platz-')) setStep(hash.slice(7), false);
    } else return;
    root.scrollIntoView({block: 'start', behavior: 'instant'});
  }
  addEventListener('load', followHash);
  addEventListener('hashchange', followHash);
  document.addEventListener('visibilitychange', syncModel);
  reduced.addEventListener('change', () => {cancelAnimationFrame(tween); plan = planTarget; syncModel();});
  if (header) new MutationObserver(syncModel).observe(header, {attributes: true, attributeFilter: ['data-offers-open']});
  new MutationObserver(syncModel).observe(document.body, {attributes: true, attributeFilter: ['class']});
  setArea('agentario', false); setStep('voice', false);
})();
