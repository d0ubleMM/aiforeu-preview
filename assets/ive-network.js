(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  for (const figure of document.querySelectorAll('[data-ive-network]')) {
    const stage = figure.querySelector('.ive-net-stage');
    const origin = stage.querySelector('.ive-net-origin');
    const flight = origin.querySelector('.ive-net-flight');
    const shadow = origin.querySelector('.ive-net-shadow');
    const airframe = origin.querySelector('.ive-net-airframe');
    const poster = airframe.querySelector('img');
    const poses = airframe.querySelector('.ive-net-poses');
    const pets = [...stage.querySelectorAll('.ive-net-pet')];
    const paths = [...stage.querySelectorAll('.ive-net-wires path')];
    const replay = figure.querySelector('.ive-net-replay');
    const picker = figure.querySelector('#ive-models-agent');

    if (picker) {
      pets.forEach(pet => {
        const choose = document.createElement('button');
        choose.type = 'button';
        choose.className = 'ive-net-choose';
        choose.setAttribute('aria-label', pet.querySelector('.ive-net-name').textContent.trim());
        choose.setAttribute('aria-controls', 'ive-models-result');
        choose.addEventListener('click', () => {
          picker.value = pet.dataset.agent;
          picker.dispatchEvent(new Event('change', {bubbles: true}));
        });
        pet.append(choose);
      });
      function syncSelection() {
        pets.forEach((pet, index) => {
          const selected = pet.dataset.agent === picker.value;
          pet.querySelector('button').setAttribute('aria-pressed', String(selected));
          pet.classList.toggle('is-selected', selected);
          paths[index].classList.toggle('is-selected', selected);
        });
      }
      picker.addEventListener('change', syncSelection);
      syncSelection();
    }
    if (!stage.animate || !window.IntersectionObserver) continue;

    let animations = [];
    let generation = 0;
    const atlases = new Map();
    let stageSize = '';
    function loadAtlas() {
      const pixels = airframe.offsetWidth * Math.min(window.devicePixelRatio || 1, 3);
      const width = pixels <= 320 ? 320 : pixels <= 640 ? 640 : 960;
      if (!atlases.has(width)) {
        const atlas = new Image();
        const filename = width === 320 ? 'bomber-flight.webp' : 'bomber-flight-' + width + '.webp';
        atlas.src = new URL(filename, poster.src).href;
        atlases.set(width, atlas.decode().then(() => atlas.src).catch(() => {
          atlases.delete(width);
          return '';
        }));
      }
      return atlases.get(width);
    }
    function settle() {
      generation++;
      for (const animation of animations) animation.cancel();
      animations = [];
      poster.style.visibility = '';
      poses.style.backgroundImage = '';
      figure.dataset.netState = 'complete';
    }
    function animate(element, frames, timing) {
      const animation = element.animate(frames, timing);
      animations.push(animation);
      return animation;
    }

    async function play() {
      settle();
      if (reduced.matches) return;
      const run = generation;
      figure.dataset.netState = 'ready';
      const source = await loadAtlas();
      if (run !== generation) return;
      if (!source) { settle(); return; }
      figure.dataset.netState = 'playing';
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      poses.style.backgroundImage = 'url("' + source + '")';
      poster.style.visibility = 'hidden';
      const frames = Array.from({length: 36}, (_, frame) => ({
        offset: frame / 35, easing: 'steps(1, end)',
        backgroundPosition: (frame % 6 * 20) + '% ' + (Math.floor(frame / 6) * 20) + '%'
      }));
      animate(poses, frames, {duration: 1450, fill: 'forwards'});

      // The camera poses supply the changing perspective. This curve moves the
      // same ship from the distant edge to the fixed hatch used by every pet.
      const approach = [];
      for (let step = 0; step <= 45; step++) {
        const t = step / 45;
        const remaining = (1 - t) ** 2;
        const x = -width * .62 * remaining + width * .034 * Math.sin(Math.PI * t) ** 2;
        const y = -height * .15 * remaining + height * .04 * Math.sin(Math.PI * t);
        const scale = .20 + .8 * (1 - remaining);
        approach.push({transform: 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')'});
      }
      animate(flight, approach, {duration: 1080});
      animate(shadow, [{opacity: 0, transform: 'scale(.35)'}, {opacity: 1, transform: 'none'}],
        {delay: 300, duration: 780, fill: 'backwards'});
      const launch = origin.getBoundingClientRect();
      pets.forEach((pet, index) => {
        const finish = pet.getBoundingClientRect();
        const dx = launch.x - finish.x;
        const dy = launch.y - finish.y;
        const lift = Math.min(47, height * .105);
        const delay = 1310 + 155 * index;
        const duration = 580;
        const arc = [];
        for (let sample = 0; sample <= 20; sample++) {
          const t = sample / 20;
          const x = dx * (1 - t);
          const y = dy * (1 - t) - 4 * lift * t * (1 - t);
          const scale = .10 + .90 * Math.min(1, t * 1.6);
          const angle = Math.sign(dx) * 9 * Math.sin(Math.PI * t);
          arc.push({offset: .88 * t, opacity: Math.min(1, t * 5),
            transform: 'translate(' + x + 'px,' + y + 'px) rotate(' + angle + 'deg) scale(' + scale + ')'});
        }
        arc.push({offset: .94, opacity: 1, transform: 'translateY(2px) scale(1.08,.91)'});
        arc.push({offset: 1, opacity: 1, transform: 'none'});
        animate(pet.querySelector('.ive-net-jumper'), arc, {delay, duration, fill: 'backwards'});
        animate(pet.querySelector('.ive-net-name'), [{opacity: 0}, {opacity: 1}],
          {delay: delay + duration - 90, duration: 180, fill: 'backwards'});
        const wire = animate(paths[index], [
          {strokeDasharray: '1 1', strokeDashoffset: 1, opacity: 0},
          {offset: .02, strokeDasharray: '1 1', strokeDashoffset: .99, opacity: 1},
          {strokeDasharray: '1 1', strokeDashoffset: 0, opacity: 1}
        ], {delay: delay + duration, duration: 390, easing: 'ease-out', fill: 'backwards'});
        if (index === pets.length - 1) wire.finished.then(() => {
          if (generation === run) settle();
        }).catch(() => {});
      });
    }

    replay.addEventListener('click', () => {
      const bounds = stage.getBoundingClientRect();
      if (bounds.top < 72 || bounds.bottom > window.innerHeight) {
        stage.scrollIntoView({block: 'center', behavior: 'instant'});
      }
      play();
    });
    function motionChanged() {
      settle();
      replay.hidden = reduced.matches;
    }
    reduced.addEventListener('change', motionChanged);
    motionChanged();
    if (!reduced.matches) figure.dataset.netState = 'ready';
    const preload = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !reduced.matches) {
        loadAtlas();
        preload.disconnect();
      }
    }, {rootMargin: '480px'});
    preload.observe(stage);
    new IntersectionObserver(entries => {
      const entry = entries[0];
      if (entry.intersectionRatio >= .45 && figure.dataset.netState === 'ready') play();
      if (!entry.isIntersecting && figure.dataset.netState === 'playing') settle();
    }, {threshold: [0,.45]}).observe(stage);
    if (window.ResizeObserver) {
      new ResizeObserver(entries => {
        const rect = entries[0].contentRect;
        const size = Math.round(rect.width) + 'x' + Math.round(rect.height);
        if (stageSize && size !== stageSize && figure.dataset.netState === 'playing') settle();
        stageSize = size;
      }).observe(stage);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) settle();
    });
  }
})();
