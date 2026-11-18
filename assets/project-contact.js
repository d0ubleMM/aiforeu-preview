(() => {
 'use strict';
 const form=document.querySelector('[data-project-form]');if(!form)return;
 const topic=form.querySelector('#project-topic'), task=form.querySelector('#project-task'), draft=form.querySelector('[data-project-draft]'), mail=form.querySelector('[data-project-mail]'), copy=form.querySelector('[data-project-copy]'), text=form.querySelector('[data-project-text]'), status=form.querySelector('[data-project-status]');
 if(!topic||!task||!draft||!mail||!copy||!text||!status)return;
 const t=value=>window.AiforeuLanguage?.t(value,'de')||value;
 const params=new URLSearchParams(location.search),requested=params.get('thema')==='VerkehrsOS'?'VerkehrsAI':params.get('thema');
 if(requested){const option=[...topic.options].find(o=>o.value.toLowerCase().startsWith(requested.toLowerCase()));if(option)topic.value=option.value;}
 const integration=params.get('integration')?.trim().replace(/[\r\n]/g,' ').slice(0,80);
 let generatedPrefill='';
 const prefill=()=>{if(integration&&(!task.value||task.value===generatedPrefill)){generatedPrefill=t('Ich möchte {0} mit Agentario verbinden. Unser gewünschter Ablauf:').replace('{0}',integration)+' ';task.value=generatedPrefill;}};
 if(window.AiforeuLanguage?.ready)prefill();window.addEventListener('aiforeu:language-ready',prefill);
 const invalidate=()=>{draft.hidden=true;status.textContent='';task.setCustomValidity('');};topic.addEventListener('change',invalidate);task.addEventListener('input',invalidate);
 window.addEventListener('aiforeu:language-ready',invalidate);
 form.addEventListener('submit',event=>{event.preventDefault();task.setCustomValidity(task.value.trim().length < 10 ? t('Bitte beschreiben Sie die Aufgabe mit mindestens zehn Zeichen.') : '');if(!form.reportValidity())return;const body=[t('Hallo AIFOREU-Team,'),task.value.trim(),t('Ich möchte mit Ihnen über die passende Umsetzung sprechen.'),t('Viele Grüße')].join('\n\n');text.value=body;mail.href=`mailto:contact@aiforgov.eu?subject=${encodeURIComponent(t(topic.value))}&body=${encodeURIComponent(body)}`;draft.hidden=false;status.textContent='Es wurde noch nichts versendet.';mail.focus();});
 copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(`${t(topic.value)}\n\n${text.value}`);status.textContent='Anfragetext kopiert.';}catch{ text.focus();text.select();status.textContent='Bitte den markierten Text kopieren.';}});
})();
