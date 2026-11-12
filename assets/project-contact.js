(() => {
 'use strict';
 const form=document.querySelector('[data-project-form]');if(!form)return;
 const topic=form.querySelector('#project-topic'), task=form.querySelector('#project-task'), draft=form.querySelector('[data-project-draft]'), mail=form.querySelector('[data-project-mail]'), copy=form.querySelector('[data-project-copy]'), text=form.querySelector('[data-project-text]'), status=form.querySelector('[data-project-status]');
 if(!topic||!task||!draft||!mail||!copy||!text||!status)return;
 const params=new URLSearchParams(location.search),requested=params.get('thema');
 if(requested){const option=[...topic.options].find(o=>o.value.toLowerCase().startsWith(requested.toLowerCase()));if(option)topic.value=option.value;}
 const integration=params.get('integration')?.trim().replace(/[\r\n]/g,' ').slice(0,80);
 if(integration&&!task.value)task.value=`Ich möchte ${integration} mit Agentario verbinden. Unser gewünschter Ablauf: `;
 const invalidate=()=>{draft.hidden=true;status.textContent='';task.setCustomValidity('');};topic.addEventListener('change',invalidate);task.addEventListener('input',invalidate);
 form.addEventListener('submit',event=>{event.preventDefault();task.setCustomValidity(task.value.trim().length < 10 ? 'Bitte beschreiben Sie die Aufgabe mit mindestens zehn Zeichen.' : '');if(!form.reportValidity())return;const body=`Hallo AIFOREU-Team,\n\n${task.value.trim()}\n\nIch möchte mit Ihnen über die passende Umsetzung sprechen.\n\nViele Grüße`;text.value=body;mail.href=`mailto:contact@aiforgov.eu?subject=${encodeURIComponent(topic.value)}&body=${encodeURIComponent(body)}`;draft.hidden=false;status.textContent='Es wurde noch nichts versendet.';mail.focus();});
 copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(`${topic.value}\n\n${text.value}`);status.textContent='Anfragetext kopiert.';}catch{ text.focus();text.select();status.textContent='Bitte den markierten Text kopieren.';}});
})();
