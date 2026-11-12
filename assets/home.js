(() => {
'use strict';

const examples = {
  anfragen: {
    label: 'KUNDENSERVICE & EMPFANG', title: ['Eine gute Antwort.', 'Ohne die ganze Vorarbeit.'],
    description: 'Anfragen verstehen, Informationen zuordnen und Antworten vorbereiten. Ihr Team übernimmt dort, wo Erfahrung und persönlicher Kontakt zählen.',
    link: 'Über Ihre Anfragen sprechen',
    steps: [['EINGANG', 'Eine Anfrage kommt an', 'Per E-Mail, Formular oder Telefon.'], ['VORBEREITUNG', 'Die passende Information liegt bereit', 'Anliegen und freigegebenes Wissen zusammenführen.'], ['IHR TEAM', 'Prüfen. Entscheiden. Antworten.', 'Mit Kontext statt mit einer leeren Seite.']]
  },
  wissen: {
    label: 'INTERNES WISSEN & DOKUMENTE', title: ['Die Antwort ist schon da.', 'Machen wir sie auffindbar.'],
    description: 'Wissen liegt oft verteilt in Dokumenten, Ordnern und Köpfen. Wir helfen, freigegebene Informationen zugänglich zu machen – mit Quellen, die Ihr Team prüfen kann.',
    link: 'Über Ihr Wissen sprechen',
    steps: [['FRAGE', 'Was gilt für diesen Vorgang?', 'Eine Frage in ganz normaler Sprache.'], ['VORBEREITUNG', 'Freigegebene Unterlagen durchsuchen', 'Passende Informationen mit Quellen zusammenstellen.'], ['IHR TEAM', 'Nachlesen. Einordnen. Weiterarbeiten.', 'Die Grundlage bleibt nachvollziehbar.']]
  },
  ablaeufe: {
    label: 'VERWALTUNG & OPERATIVE ABLÄUFE', title: ['Einmal erfassen.', 'Sinnvoll weiterverwenden.'],
    description: 'Wenn Daten von einem Programm ins nächste wandern, geht Zeit verloren. Wir prüfen, welche Schritte sich verbinden lassen und wann Ihr Team eingreifen soll.',
    link: 'Über Ihre Abläufe sprechen',
    steps: [['AUSLÖSER', 'Ein neuer Vorgang beginnt', 'Zum Beispiel ein ausgefülltes Anfrageformular.'], ['VORBEREITUNG', 'Informationen zuordnen', 'Angaben prüfen und die Übergabe vorbereiten.'], ['IHR TEAM', 'Ausnahmen erkennen. Klar entscheiden.', 'Unvollständige Vorgänge gezielt prüfen.']]
  }
};
const tabs = [...document.querySelectorAll('[data-example]')];
function setExample(key) {
  const item = examples[key];
  tabs.forEach(tab => { const selected = tab.dataset.example === key; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; });
  document.querySelector('#example-panel').setAttribute('aria-labelledby', `tab-${key}`);
  document.querySelector('#example-label').textContent = item.label;
  const heading = document.querySelector('#example-title');
  heading.replaceChildren(document.createTextNode(item.title[0]), document.createElement('br'), document.createTextNode(item.title[1]));
  document.querySelector('#example-description').textContent = item.description;
  document.querySelector('#example-link').firstChild.textContent = item.link + ' ';
  document.querySelectorAll('#workflow-steps li').forEach((li, index) => {
    li.querySelector('small').textContent = item.steps[index][0];
    li.querySelector('strong').textContent = item.steps[index][1];
    li.querySelector('p').textContent = item.steps[index][2];
  });
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => setExample(tab.dataset.example));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); setExample(tabs[next].dataset.example); tabs[next].focus(); }
  });
});

const briefDialog = document.querySelector('#brief-dialog');
const briefForm = document.querySelector('#brief-form');
const briefSteps = [...document.querySelectorAll('.brief-step')];
const nextButton = document.querySelector('#brief-next');
const backButton = document.querySelector('#brief-back');
let currentStep = 0;
let briefText = '';
let lastDialogTrigger = null;
function openDialog(dialog, trigger) { lastDialogTrigger = trigger; document.body.classList.add('modal-open'); dialog.showModal(); }
document.querySelector('#open-brief').addEventListener('click', e => openDialog(briefDialog, e.currentTarget));
function makeSummary() {
  const data = new FormData(briefForm);
  const company = String(data.get('company') || '').trim();
  const description = String(data.get('description') || '').trim();
  briefText = `Hallo AIFOREU,\n\nwir möchten über einen möglichen KI-Einsatz sprechen.\n\nBereich: ${data.get('topic')}`;
  if (company) briefText += `\nUnternehmen: ${company}`;
  briefText += `\n\nUnser Ablauf / unsere Idee:\n${description || 'Das möchten wir gerne gemeinsam herausfinden.'}\n\nWie könnte ein sinnvoller erster Schritt aussehen?`;
  document.querySelector('#brief-summary').textContent = briefText;
  document.querySelector('#brief-email').href = `mailto:contact@aiforgov.eu?subject=${encodeURIComponent('Projektanfrage: ' + data.get('topic'))}&body=${encodeURIComponent(briefText)}`;
  document.querySelector('#copy-status').textContent = '';
}
function showStep(step) {
  currentStep = step;
  briefSteps.forEach((node, i) => { node.hidden = i !== step; });
  document.querySelector('#brief-progress').textContent = `${step + 1} von 3`;
  document.querySelector('#progress-fill').style.width = `${(step + 1) / 3 * 100}%`;
  backButton.hidden = step === 0;
  nextButton.hidden = step === 2;
  nextButton.disabled = step === 0 && !briefForm.querySelector('[name=topic]:checked');
  // Keep the dialog name on the currently visible heading.
  briefSteps.forEach(node => node.querySelector('h2').removeAttribute('id'));
  const heading = briefSteps[step].querySelector('h2');
  heading.id = 'brief-title'; heading.tabIndex = -1;
  if (step === 2) makeSummary();
  briefDialog.scrollTop = 0; heading.focus({preventScroll:true});
}
briefForm.addEventListener('change', () => { if (currentStep === 0) nextButton.disabled = !briefForm.querySelector('[name=topic]:checked'); });
briefForm.addEventListener('submit', e => e.preventDefault());
nextButton.addEventListener('click', () => { if (currentStep === 0 && !briefForm.querySelector('[name=topic]:checked')) return; if (currentStep < 2) showStep(currentStep + 1); });
backButton.addEventListener('click', () => { if (currentStep > 0) showStep(currentStep - 1); });
document.querySelector('#copy-brief').addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try { await navigator.clipboard.writeText(briefText); status.textContent = 'Kopiert. Sie können den Text in Ihre E-Mail einfügen.'; }
  catch { const range = document.createRange(); range.selectNodeContents(document.querySelector('#brief-summary')); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); status.textContent = 'Der Text ist markiert. Kopieren Sie ihn mit Strg+C oder ⌘C.'; }
});

document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); });
  dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); lastDialogTrigger?.focus(); });
});

document.body.classList.add('home-ready');
})();
