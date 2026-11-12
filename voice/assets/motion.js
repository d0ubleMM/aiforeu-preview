(function(){
'use strict';
var motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-voice-flow]').forEach(function (flow) {
    var tabs = Array.from(flow.querySelectorAll('.flow-tab'));
    var panels = Array.from(flow.querySelectorAll('.flow-panel'));
    var tablist = flow.querySelector('.flow-tabs');
    var toggle = flow.querySelector('.flow-toggle');
    var label = toggle.querySelector('.flow-toggle-text');
    var current = 0, elapsed = 0, last = 0, raf = 0;
    var visible = false, paused = true, dwell = 6200, previewTimer = 0;
    tablist.setAttribute('role', 'tablist');
    tabs.forEach(function (tab) { tab.setAttribute('role', 'tab'); });
    panels.forEach(function (panel) { panel.setAttribute('role', 'tabpanel'); });
    flow.classList.add('flow-ready'); toggle.hidden = false;

    function select(index) {
      current = index; elapsed = 0; last = 0;
      flow.style.setProperty('--flow-position', index);
      flow.style.setProperty('--flow-progress', 0);
      tabs.forEach(function (tab, i) {
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
        panels[i].hidden = i !== index;
      });
    }
    function canRun() { return visible && !paused && !motion.matches && !document.hidden; }
    function frame(now) {
      if (!canRun()) { raf = 0; last = 0; return; }
      if (last) elapsed += Math.min(now - last, 100);
      last = now;
      if (elapsed >= dwell) select((current + 1) % tabs.length);
      flow.style.setProperty('--flow-progress', Math.min(elapsed / dwell, 1));
      raf = requestAnimationFrame(frame);
    }
    function sync() {
      var running = canRun();
      flow.classList.toggle('flow-running', running);
      if (document.hidden || motion.matches) flow.classList.remove('flow-previewing');
      flow.classList.toggle('flow-paused', paused || motion.matches);
      label.textContent = motion.matches ? 'Bewegung reduziert' : paused ? 'Ablauf abspielen' : 'Ablauf pausieren';
      toggle.disabled = motion.matches;
      toggle.title = motion.matches ? 'Reduzierte Bewegung ist in Ihren Systemeinstellungen aktiviert.' : '';
      if (running && !raf) { last = 0; raf = requestAnimationFrame(frame); }
      if (!running && raf) { cancelAnimationFrame(raf); raf = 0; last = 0; }
    }
    function choose(i) {
      paused = true;
      flow.classList.add('flow-engaged');
      select(i); sync();
      clearTimeout(previewTimer);
      if (!motion.matches) {
        flow.classList.add('flow-previewing');
        previewTimer = setTimeout(function () { flow.classList.remove('flow-previewing'); }, 3600);
      }
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { choose(i); });
      tab.addEventListener('keydown', function (event) {
        var next = i;
        if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault(); choose(next); tabs[next].focus();
      });
    });
    // Once a reader focuses the component, it remains still until explicitly played.
    flow.addEventListener('focusin', function (event) {
      if (event.target !== toggle) { paused = true; sync(); }
    });
    toggle.addEventListener('click', function () {
      clearTimeout(previewTimer); flow.classList.remove('flow-previewing');
      flow.classList.add('flow-engaged'); paused = !paused; sync();
    });
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', function () { if (motion.matches) paused = true; sync(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting; sync();
      }, { threshold: .15 }).observe(flow);
    } else { visible = true; }
    select(0); sync();
  });

})();
