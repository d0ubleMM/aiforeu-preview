/* Native page scrolling drives the scene. The two destinations are always directly selectable. */
(() => {
  'use strict';
  const root = document.querySelector('[data-business-scenes]');
  if (!root) return;
  const stage = root.querySelector('.business-stage');
  const panels = [...root.querySelectorAll('[data-scene]')];
  const agentario = panels[0];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('.global-header');
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = n => { n = clamp(n); return n * n * (3 - 2 * n); };
  const steps = ['voice', 'desktop', 'workflows'];
  const stepProgress = [.045, .215, .355];
  const anchors = {'#agentario-scene': .045, '#traffic-scene': .61, '#platz-voice': .045, '#platz-desktop': .215, '#platz-workflows': .355, '#platz-traffic': .61};
  let enhanced = false, progress = 0, area = '', step = '', trafficMode = 'model';
  let frame = 0, inView = false, model = null, modelLoading = false;
  let runway = 1, top = 0, headerHeight = 73;
  let staticPlan = 0;
  let paused = false;

  function setStep(value) {
    if (step === value) return;
    step = value;
    agentario.dataset.step = value;
    root.querySelectorAll('[data-step-view]').forEach(view => { view.hidden = view.dataset.stepView !== value; });
    root.querySelectorAll('[data-step-select]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.stepSelect === value)));
    if (!reduced.matches && inView) root.querySelector(`[data-step-view="${value}"]`).animate(
      [{opacity: .35, transform: 'translateY(9px)'}, {opacity: 1, transform: 'translateY(0)'}],
      {duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)'}
    );
  }

  function setArea(value) {
    area = value;
    root.dataset.area = value;
    root.querySelectorAll('.business-nav [data-area]').forEach(link => {
      if (enhanced && link.dataset.area === value) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    panels.forEach(panel => {
      const inactive = enhanced && panel.dataset.scene !== value;
      // Moving focus out before hiding a scene also keeps reverse scrolling usable with a keyboard.
      if (inactive && panel.contains(document.activeElement)) root.querySelector(`.business-nav [data-area="${value}"]`).focus({preventScroll: true});
      panel.inert = inactive;
      if (inactive) panel.setAttribute('aria-hidden', 'true');
      else panel.removeAttribute('aria-hidden');
    });
  }

  function syncModel(plan) {
    const allowed = !paused && !reduced.matches && !document.hidden && !header?.hasAttribute('data-offers-open') && !document.body.classList.contains('global-menu-open');
    root.dataset.motion = String(allowed);
    model?.update({plan, progress: enhanced ? clamp((progress - .5) * 2) : .35, active: inView && (!enhanced || area === 'traffic'), moving: allowed});
  }

  function paint() {
    frame = 0;
    if (enhanced && !document.body.classList.contains('global-menu-open')) progress = clamp((scrollY - top + headerHeight) / runway);
    const nextArea = progress < .495 ? 'agentario' : 'traffic';
    if (area !== nextArea) setArea(nextArea);
    if (enhanced) {
      setStep(progress < .15 ? 'voice' : progress < .29 ? 'desktop' : 'workflows');
      root.style.setProperty('--scene-mix', smooth((progress - .43) / .13).toFixed(4));
      root.style.setProperty('--agent-turn', clamp(progress / .4).toFixed(4));
      root.style.setProperty('--journey', progress.toFixed(4));
    }
    const plan = enhanced ? smooth((progress - .69) / .19) : staticPlan;
    const nextMode = plan > .5 && root.querySelector('[data-junction]').dataset.ready === 'true' ? 'plan' : 'model';
    if (nextMode !== trafficMode) {
      trafficMode = nextMode;
      root.querySelectorAll('[data-traffic-select]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.trafficSelect === nextMode)));
      root.querySelector('[data-junction-label]').textContent = nextMode === 'plan' ? 'Planebenen werden sichtbar' : 'Die Kreuzung im Zusammenhang';
    }
    syncModel(plan);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(paint); }

  function measure() {
    const wasEnhanced = enhanced;
    enhanced = !reduced.matches && innerHeight >= 740 && innerWidth >= 350;
    root.classList.toggle('is-enhanced', enhanced);
    headerHeight = header?.getBoundingClientRect().height || 73;
    top = root.getBoundingClientRect().top + scrollY;
    runway = Math.max(1, root.offsetHeight - stage.offsetHeight);
    if (!enhanced) progress = 0;
    if (wasEnhanced !== enhanced || !area) setArea(progress < .495 ? 'agentario' : 'traffic');
    schedule();
  }

  function navigate(value, hash) {
    if (enhanced) {
      window.scrollTo({top: top - headerHeight + value * runway, behavior: reduced.matches ? 'instant' : 'smooth'});
      if (hash) history.replaceState(null, '', hash);
    } else if (hash) {
      const target = document.getElementById(hash.slice(1));
      target?.scrollIntoView({behavior: 'instant', block: 'start'});
      history.replaceState(null, '', hash);
    }
  }

  root.querySelectorAll('[data-area]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const traffic = link.dataset.area === 'traffic';
    navigate(traffic ? .61 : .045, traffic ? '#traffic-scene' : '#agentario-scene');
  }));
  root.querySelectorAll('[data-step-select]').forEach(button => button.addEventListener('click', () => {
    const value = button.dataset.stepSelect;
    if (enhanced) navigate(stepProgress[steps.indexOf(value)]);
    else { setStep(value); root.style.setProperty('--agent-turn', steps.indexOf(value) / 2); }
  }));
  root.querySelectorAll('[data-traffic-select]').forEach(button => button.addEventListener('click', () => {
    const plan = button.dataset.trafficSelect === 'plan';
    if (enhanced) navigate(plan ? .93 : .61);
    else { staticPlan = plan ? 1 : 0; schedule(); }
  }));
  root.querySelector('[data-motion-toggle]').addEventListener('click', event => {
    paused = !paused;
    const button = event.currentTarget, label = paused ? 'Animation fortsetzen' : 'Animation pausieren';
    button.setAttribute('aria-pressed', String(paused));
    button.setAttribute('aria-label', label); button.title = label;
    button.firstElementChild.textContent = paused ? '▷' : 'Ⅱ';
    schedule();
  });

  async function loadModel() {
    if (modelLoading) return;
    modelLoading = true;
    try {
      const {mountJunction} = await import('./business-junction.js?v=20261117-scenes2');
      model = mountJunction(root.querySelector('[data-junction]'));
      schedule();
    } catch { root.dataset.junctionState = 'static'; }
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      root.dataset.inView = String(inView);
      schedule();
    }).observe(stage);
    const preload = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      loadModel(); preload.disconnect();
    }, {rootMargin: '700px'});
    preload.observe(root);
  } else { inView = true; root.dataset.inView = 'true'; loadModel(); }

  function followHash() {
    if (location.hash in anchors) navigate(anchors[location.hash], location.hash);
  }
  addEventListener('scroll', schedule, {passive: true});
  addEventListener('resize', measure);
  addEventListener('load', () => { measure(); followHash(); });
  addEventListener('hashchange', followHash);
  addEventListener('pageshow', measure);
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', measure);
  if (header) new MutationObserver(schedule).observe(header, {attributes: true, attributeFilter: ['data-offers-open']});
  new MutationObserver(schedule).observe(document.body, {attributes: true, attributeFilter: ['class']});
  if ('ResizeObserver' in window && header) new ResizeObserver(measure).observe(header);
  setStep('voice');
  measure();
})();
