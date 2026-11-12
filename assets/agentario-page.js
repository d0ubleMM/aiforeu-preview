/* Local illustration of Agentario's intended workflow. No network or persistence. */
(() => {
 'use strict';
 const demo = document.querySelector('[data-ag-demo]');
 if (!demo) return;
 const steps = demo.querySelector('[data-ag-steps]');
 const fallback = demo.querySelector('[data-ag-fallback]');
 const tabs = [...demo.querySelectorAll('[data-ag-step]')];
 const panels = [...demo.querySelectorAll('[data-ag-panel]')];
 const next = [...demo.querySelectorAll('[data-ag-next]')];
 const approve = demo.querySelector('[data-ag-approve]');
 const approveLabel = demo.querySelector('[data-ag-approve-label]');
 const reset = demo.querySelector('[data-ag-reset]');
 const location = demo.querySelector('[data-ag-location]');
 const locationLines = [...demo.querySelectorAll('[data-ag-location-line]')];
 const reviewState = demo.querySelector('[data-ag-review-state]');
 const approvalNote = demo.querySelector('[data-ag-approval-note]');
 const resultHint = demo.querySelector('[data-ag-result-hint]');
 const resultStatus = demo.querySelector('[data-ag-result-status]');
 const counter = demo.querySelector('[data-ag-counter]');
 const status = demo.querySelector('[data-ag-status]');
 if (!steps || !fallback || tabs.length !== 4 || panels.length !== 4 ||
     !approve || !approveLabel || !reset || !location || locationLines.length !== 2 ||
     !reviewState || !approvalNote || !resultHint || !resultStatus || !counter || !status ||
     panels.some(panel => !panel.querySelector('h3'))) return;
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const names = ['Aufgabe', 'Agentenvorbereitung', 'Menschliche Freigabe', 'Ergebnis'];
 let current = 0;
 let approved = false;

 function select(index, focusHeading = false, announce = true) {
  if (!Number.isInteger(index) || index < 0 || index > 3 || (index === 3 && !approved)) return false;
  current = index;
  tabs.forEach((tab, i) => {
   tab.setAttribute('aria-selected', String(i === index));
   tab.tabIndex = i === index ? 0 : -1;
  });
  panels.forEach((panel, i) => {
   panel.hidden = i !== index;
   panel.classList.toggle('ag-panel-enter', i === index);
  });
  counter.textContent = `Schritt ${index + 1} von 4`;
  demo.dataset.agCurrent = String(index);
  if (announce) status.textContent = `Schritt ${index + 1} von 4: ${names[index]}.`;
  if (focusHeading) {
   const heading = panels[index].querySelector('h3');
   heading.focus({ preventScroll: true });
   heading.scrollIntoView({ block: 'nearest', behavior: reduced.matches ? 'auto' : 'smooth' });
  }
  return true;
 }

 function updateApproval() {
  tabs[3].disabled = !approved;
  resultHint.textContent = approved ? 'Im Beispiel freigegeben' : 'Nach Ihrer Freigabe';
  reviewState.textContent = approved ? 'Freigabe im Beispiel erteilt' : 'Freigabe durch das Team erforderlich';
  approvalNote.textContent = approved ? 'Im Beispiel freigegeben' : 'Wartet auf Freigabe';
  approveLabel.textContent = approved ? 'Freigegebenes Ergebnis ansehen' : 'Im Beispiel freigeben';
  resultStatus.textContent = approved ? 'Im Beispiel freigegeben' : 'Ein freigegebener Entwurf';
  demo.classList.toggle('ag-is-approved', approved);
 }

 tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => select(index));
  tab.addEventListener('keydown', event => {
   if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
   event.preventDefault();
   const available = tabs.map((item, i) => item.disabled ? -1 : i).filter(i => i >= 0);
   const here = available.indexOf(index);
   const target = event.key === 'Home' ? available[0] : event.key === 'End' ? available[available.length - 1] :
    available[(here + (event.key === 'ArrowRight' ? 1 : -1) + available.length) % available.length];
   if (select(target)) tabs[target].focus();
  });
 });
 next.forEach(button => button.addEventListener('click', () => select(Number(button.dataset.agNext), true)));
 approve.addEventListener('click', () => {
  approved = true;
  updateApproval();
  select(3, true, false);
  status.textContent = 'Im Beispiel freigegeben. Der Entwurf ist bereit. Es wurde nichts versendet.';
 });
 location.addEventListener('change', () => {
  const wasApproved = approved;
  approved = false;
  locationLines.forEach(line => { line.hidden = !location.checked; });
  updateApproval();
  if (current === 3) select(2, true, false);
  status.textContent = `${location.checked ? 'Rückfrage zum Standort ergänzt.' : 'Rückfrage zum Standort entfernt.'}${wasApproved ? ' Der geänderte Entwurf braucht eine neue Freigabe.' : ''}`;
 });
 reset.addEventListener('click', () => {
  approved = false;
  location.checked = false;
  locationLines.forEach(line => { line.hidden = true; });
  updateApproval();
  select(0, true, false);
  status.textContent = 'Ablaufbeispiel zurückgesetzt. Schritt 1: Aufgabe.';
 });

 // All four steps remain readable if setup does not run. Enhance only after binding.
 panels.forEach((panel, i) => {
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', tabs[i].id);
 });
 updateApproval();
 select(0, false, false);
 demo.querySelectorAll('[data-ag-interactive]').forEach(control => { control.hidden = false; });
 fallback.hidden = true;
 demo.classList.add('ag-demo-ready');
 steps.hidden = false;
})();

// This illustration is independent of the workflow demo above. Its static
// description remains available if modules or WebGL cannot be loaded.
(() => {
 const hosts = [...document.querySelectorAll('[data-agentario-scene]')];
 if (!hosts.length) return;
 const source = new URL('./agentario-scene/agentario-scene.js', document.currentScript.src);
 import(source.href).then(({ mountAgentarioScene }) => {
  const still = new URLSearchParams(location.search).get('scene') === 'end';
  hosts.forEach(host => mountAgentarioScene(host, { still }));
 }).catch(() => { /* The semantic figure remains visible. */ });
})();
