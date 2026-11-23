(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  for (const figure of document.querySelectorAll('[data-ive-network]')) {
    const stage = figure.querySelector('.ive-net-stage');
    const origin = stage.querySelector('.ive-net-origin');
    const pets = [...stage.querySelectorAll('.ive-net-pet')];
    const replay = figure.querySelector('.ive-net-replay');
    if (!stage.animate || !window.IntersectionObserver) continue;

    let animations = [];
    let endTimer;
    let stageSize = '';

    function settle() {
      clearTimeout(endTimer);
      figure.dataset.netState = 'complete';
      for (const animation of animations) animation.cancel();
      animations = [];
    }

    function play() {
      settle();
      if (reduced.matches) return;
      figure.dataset.netState = 'playing';
      const start = origin.getBoundingClientRect();
      // Each sprite is anchored at its destination. Translate it back to the
      // same origin, then sample a ballistic arc in this layout's coordinates.
      pets.forEach((pet, index) => {
        const finish = pet.getBoundingClientRect();
        const dx = start.x - finish.x;
        const dy = start.y - finish.y;
        const height = Math.min(82, Math.hypot(dx,dy) * .38);
        const delay = 130 + 420 * index;
        const duration = 730;
        const arc = [];
        const lean = dx < 0 ? -1 : 1;
        for (let sample = 0; sample <= 16; sample++) {
          const t = sample / 16;
          const x = dx * (1 - t);
          const y = dy * (1 - t) - 4 * height * t * (1 - t);
          const scale = .24 + .76 * Math.min(1, t * 2.2);
          const angle = lean * 10 * Math.sin(Math.PI * t);
          arc.push({
            offset: .86 * t, opacity: Math.min(1, t * 6),
            transform: `translate(${x}px,${y}px) rotate(${angle}deg) scale(${scale})`
          });
        }
        arc.push({ offset: .92, opacity: 1, transform: 'translateY(2px) scale(1.09,.89)' });
        arc.push({ offset: 1, opacity: 1, transform: 'none' });
        animations.push(pet.querySelector('.ive-net-jumper').animate(arc, {delay, duration, fill: 'backwards'}));
        animations.push(pet.querySelector('.ive-net-name').animate([
          {opacity: 0, translate: '0 3px'}, {opacity: 1, translate: '0 0'}
        ], {delay: delay + duration - 100, duration: 210, fill: 'backwards'}));

        // Both SVG routings share the nodes. CSS chooses the fitting one.
        for (const group of stage.querySelectorAll('.ive-net-wires g')) {
          const path = group.querySelectorAll('path')[index];
          const tall = group.classList.contains('ive-net-tall');
          const closed = tall ? 'inset(0 0 57% 0) view-box' : 'inset(0 50% 0 0) view-box';
          const open = tall ? 'inset(0 0 19% 0) view-box' : 'inset(0 17% 0 0) view-box';
          animations.push(path.animate([
            {clipPath: closed, opacity: 0}, {offset: .02, clipPath: closed, opacity: 1},
            {clipPath: open, opacity: 1}
          ], {delay: delay + duration + 35, duration: 460, easing: 'ease-out', fill: 'backwards'}));
        }
      });
      endTimer = setTimeout(settle, 2300);
    }

    function motionChanged() {
      settle();
      replay.hidden = reduced.matches;
    }

    replay.addEventListener('click', play);
    reduced.addEventListener('change', motionChanged);
    motionChanged();

    if (!reduced.matches) figure.dataset.netState = 'ready';
    const visibility = new IntersectionObserver(entries => {
      const entry = entries[0];
      if (entry.isIntersecting && entry.intersectionRatio >= .35 && figure.dataset.netState === 'ready') {
        play();
      } else if (!entry.isIntersecting && figure.dataset.netState === 'playing') {
        settle();
      }
    }, {threshold: [0,.35]});
    visibility.observe(stage);

    if (window.ResizeObserver) {
      new ResizeObserver(entries => {
        const rect = entries[0].contentRect;
        const size = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
        if (stageSize && size !== stageSize && figure.dataset.netState === 'playing') settle();
        stageSize = size;
      }).observe(stage);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && figure.dataset.netState === 'playing') settle();
    });
  }
})();
