(function(){
'use strict';
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function changed(el){if(reduced.matches)return;el.classList.remove('was-changed');void el.offsetWidth;el.classList.add('was-changed');}
// Shared navigation and keyboard focus.
const burger=$('#nav-burger'), menu=$('#mobile-menu');
function closeMenu(){menu.hidden=true;burger.setAttribute('aria-expanded','false');burger.setAttribute('aria-label','Menü öffnen');}
if(burger&&menu){
 burger.addEventListener('click',()=>{if(!menu.hidden){closeMenu();return;}menu.hidden=false;burger.setAttribute('aria-expanded','true');burger.setAttribute('aria-label','Menü schließen');$('a',menu).focus();});
 menu.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
 document.addEventListener('keydown',e=>{if(menu.hidden)return;if(e.key==='Escape'){closeMenu();burger.focus();}if(e.key==='Tab'){const items=[burger,...$$('a',menu)],first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 window.addEventListener('resize',()=>{if(innerWidth>800)closeMenu();},{passive:true});
}
// A prerecorded, explicitly labelled two-voice example. Media time owns the transcript.
const demo=$('[data-demo]');
if(demo){
 const scenes=JSON.parse($('#demo-data').textContent),tabs=$$('[data-demo-scene]',demo);
 const media=$('.demo-audio',demo),stage=$('.demo-stage',demo),log=$('.demo-conversation',demo),receipt=$('.demo-result',demo),play=$('.demo-play',demo),playLabel=$('.demo-play-label',demo),symbol=$('.play-symbol',demo),reset=$('.demo-reset',demo),status=$('.demo-status',demo),mute=$('.demo-mute',demo),read=$('.demo-read',demo),error=$('.demo-error',demo),clock=$('.demo-clock',demo),progress=$('.demo-progress-fill',demo);
 let scene=0,started=false,finished=false,reading=false,pending=false,buffering=false,playing=false,shown=0,request=0,callFrame=0;
 const format=t=>{t=Math.max(0,Math.floor(t));return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');};
 const say=(element,text)=>{if(element.textContent!==text)element.textContent=text;};
 function preview(complete=false){say($('.demo-disclosure',demo),scenes[scene].disclosure);const data=scenes[scene].preview;receipt.dataset.kind=data.kind;receipt.classList.toggle('is-confirmed',complete);$('.demo-result-day',receipt).textContent=data.day;$('.demo-result-value',receipt).textContent=data.value;$('.demo-result-title',receipt).textContent=data.title;$('.demo-result-state',receipt).textContent=complete?data.complete:data.pending;}
 function appendLine(line){
  const follow=stage.scrollHeight-stage.scrollTop-stage.clientHeight<48;
  const li=document.createElement('li');li.className='demo-line'+(line.speaker==='AIFOREU Voice'?' assistant':' caller');
  const stamp=document.createElement('time');stamp.className='demo-time';stamp.dateTime='PT'+line.start+'S';stamp.textContent=line.timestamp;
  const body=document.createElement('div'),speaker=document.createElement('span');speaker.className='demo-speaker';speaker.append(document.createTextNode(line.speaker));
  const indicator=document.createElement('span');indicator.className='speaking-indicator';indicator.setAttribute('aria-hidden','true');for(let i=0;i<3;i++)indicator.appendChild(document.createElement('i'));speaker.appendChild(indicator);
  const p=document.createElement('p');p.textContent=line.text;body.append(speaker,p);li.append(stamp,body);log.appendChild(li);if(follow)stage.scrollTop=stage.scrollHeight;
 }
 function draw(){
  const data=scenes[scene],duration=data.duration,t=finished?duration:Math.min(media.currentTime||0,duration);
  if(started&&shown&&t<data.lines[shown-1].start){shown=0;log.replaceChildren();}
  while(started&&shown<data.lines.length&&(finished||t>=data.lines[shown].start))appendLine(data.lines[shown++]);
  stage.hidden=!(reading||shown>0);
  const active=playing&&!pending&&!buffering&&!finished&&!media.paused;
  const speaker=active?data.lines.find(line=>t>=line.start&&t<line.end)?.speaker:null;
  const intro=data.intro,connecting=started&&!finished&&t<(intro?.duration||0);
  const phase=finished?'complete':!started?'idle':connecting?(t<intro.ring_start?'dialing':'ringing'):'connected';
  demo.dataset.callPhase=phase;
  say($('.call-phase-label',demo),phase==='complete'?'Erledigt':phase==='idle'?'Bereit':phase==='dialing'?'Wählt …':phase==='ringing'?'Klingelt …':'Verbunden');
  $$('.call-keys i',demo).forEach((key,index)=>key.classList.toggle('is-down',active&&connecting&&t>=intro.keys[index].start&&t<intro.keys[index].end));
  demo.classList.toggle('is-playing',active);demo.classList.toggle('is-paused',started&&!active&&!finished);
  $$('.demo-line',log).forEach((line,i)=>line.classList.toggle('is-speaking',active&&t>=data.lines[i].start&&t<data.lines[i].end));
  $$('[data-call-speaker]',demo).forEach(person=>{const speaking=person.dataset.callSpeaker===speaker;person.classList.toggle('is-speaking',speaking);say($('small',person),speaking?'Spricht gerade':person.dataset.callSpeaker==='AIFOREU Voice'?(phase==='ringing'?'Wird angerufen':'KI-Assistent'):'Anrufer');});
  say(playLabel,!error.hidden?'Erneut versuchen':pending?'Abbrechen':finished?'Erneut anhören':playing?'Pausieren':started?'Fortsetzen':'Anruf anhören');symbol.textContent=playing||pending?'Ⅱ':'▶';
  say(status,!error.hidden?'Audio nicht verfügbar. Sie können das Transkript lesen.':reading?'Vollständiges Transkript.':finished?'Beispiel beendet.':pending||buffering?'Audio wird geladen …':!started?'Bereit zum Anhören.':!playing?'Gespräch pausiert.':phase==='dialing'?'Die Beispielnummer wird gewählt.':phase==='ringing'?'Es klingelt bei AIFOREU Voice.':speaker==='AIFOREU Voice'?'AIFOREU Voice antwortet.':speaker?'AIFOREU Voice hört zu.':'Gespräch wird abgespielt.');
  clock.textContent=format(finished?Math.ceil(duration):t)+' / '+format(Math.ceil(duration));progress.style.width=Math.min(100,t/duration*100)+'%';
  mute.setAttribute('aria-pressed',String(!media.muted));say($('.demo-mute-label',mute),media.muted?'Ton aus':'Ton an');
  stage.setAttribute('aria-live',media.muted?'polite':'off');
  // Short keypad cues follow the media clock; no idle or whole-call frame loop.
  if(active&&connecting&&!reduced.matches){if(!callFrame)callFrame=requestAnimationFrame(()=>{callFrame=0;draw();});}
  else{cancelAnimationFrame(callFrame);callFrame=0;}
 }
 function pause(){request++;pending=false;buffering=false;playing=false;media.pause();draw();}
 function clear(){
  request++;media.pause();if(media.hasAttribute('src')){media.removeAttribute('src');media.load();}
  started=false;finished=false;reading=false;pending=false;buffering=false;playing=false;shown=0;
  log.replaceChildren();stage.hidden=true;reset.hidden=true;error.hidden=true;preview();draw();
 }
 function failed(){pending=false;buffering=false;playing=false;media.pause();error.hidden=false;draw();}
 function begin(){
  if(finished)clear();const token=++request;
  if(!media.hasAttribute('src'))media.src=scenes[scene].audio.src+'?v='+scenes[scene].audio.script_sha256.slice(0,12);
  if(media.error)media.load();
  started=true;reading=false;pending=true;error.hidden=true;stage.hidden=false;reset.hidden=false;draw();
  // Called synchronously from the user's click so mobile browsers may play sound.
  media.play().then(()=>{if(token!==request)return;pending=false;playing=!media.paused;draw();}).catch(reason=>{if(token!==request||reason.name==='AbortError')return;failed();});
 }
 function select(index){scene=index;tabs.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===scene)));clear();}
 play.addEventListener('click',()=>{if(playing||pending)pause();else begin();});
 reset.addEventListener('click',()=>{clear();begin();});
 mute.addEventListener('click',()=>{media.muted=!media.muted;draw();});
 read.addEventListener('click',()=>{clear();started=true;finished=true;reading=true;stage.hidden=false;reset.hidden=false;preview(true);draw();stage.focus({preventScroll:true});});
 media.addEventListener('playing',()=>{if(!started||reading)return;pending=false;buffering=false;playing=true;draw();});
 media.addEventListener('waiting',()=>{if(started&&!finished){buffering=true;draw();}});
 media.addEventListener('pause',()=>{if(media.paused){playing=false;buffering=false;draw();}});
 media.addEventListener('timeupdate',draw);media.addEventListener('volumechange',draw);
 media.addEventListener('ended',()=>{if(!started||reading)return;pending=false;buffering=false;playing=false;finished=true;preview(true);draw();});
 media.addEventListener('error',()=>{if(started&&!reading&&media.hasAttribute('src'))failed();});
 tabs.forEach((button,index)=>{button.addEventListener('click',()=>select(index));button.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();select(next);tabs[next].focus();});});
 $$('[data-start-demo]').forEach(button=>button.addEventListener('click',()=>{demo.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});if(!playing&&!pending)begin();play.focus({preventScroll:true});}));
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&(playing||pending))pause();});
 window.addEventListener('pagehide',pause);
 clear();
}
const languages=$('[data-languages]');
if(languages){const phrases=[['de','„I hätt gern no an Termin am Freidog. Geht da no wos?“'],['en','“Could I book an appointment for Friday, please?”'],['tr','“Cuma günü için bir randevu alabilir miyim?”'],['uk','«Чи можна записатися на п’ятницю?»'],['ar','«هل يمكنني حجز موعد يوم الجمعة؟»']];$$('[data-language]',languages).forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.language),p=$('.language-quote',languages);p.textContent=phrases[i][1];p.lang=phrases[i][0];p.dir=i===4?'rtl':'ltr';$$('[data-language]',languages).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));changed($('.language-example',languages));}));}
const sources=$('[data-sources]');
if(sources){const examples=[['Antwort aus Ihrer Website','„Am Donnerstag sind wir von 8 bis 18 Uhr für Sie da.“','Quelle: Öffnungszeiten · freigegeben'],['Antwort aus Ihrem Leistungskatalog','„Ja, wir bieten Beratungstermine an. Soll ich nach einer freien Zeit schauen?“','Quelle: Leistungen · freigegeben'],['Antwort nach Ihren Vorgaben','„Bei dieser Frage hilft Ihnen unser Service-Team persönlich. Ich verbinde Sie.“','Quelle: Interne Hinweise · Übergaberegel']];$$('[data-source]',sources).forEach(b=>b.addEventListener('click',()=>{const data=examples[Number(b.dataset.source)],out=$('.source-answer',sources);['span','p','small'].forEach((s,i)=>$(s,out).textContent=data[i]);$$('[data-source]',sources).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));changed(out);}));}
const booking=$('[data-booking]');
if(booking)$$('[data-slot]',booking).forEach(b=>b.addEventListener('click',()=>{$$('[data-slot]',booking).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));const out=$('.booking-result',booking);$('span',out).textContent=b.dataset.slot+' vorgemerkt.';$('p',out).textContent='Im echten Gespräch bestätigt die Anruferin. Danach wird gebucht.';changed(out);}));
// Revenue potential. Costs and margin remain outside this estimate.
const roi=$('#roi-form');
if(roi){const inputs=['missed','value','conversion','recovery'].map(id=>$('#roi-'+id)),format=new Intl.NumberFormat('de-DE',{maximumFractionDigits:0});function update(){const [missed,value,conv,recovery]=inputs.map(e=>Number(e.value));const calls=missed*4.33,answered=calls*recovery/100,customers=answered*conv/100,revenue=customers*value;['missed','value','conversion','recovery'].forEach((id,i)=>{$('#out-'+id).value=format.format(inputs[i].value)+['',' €',' %',' %'][i];inputs[i].style.setProperty('--fill',((inputs[i].value-inputs[i].min)/(inputs[i].max-inputs[i].min)*100)+'%');});$('#roi-rev').textContent=format.format(revenue)+' €';$('#roi-sub').textContent='Rund '+format.format(revenue*12)+' € im Jahr – vor Kosten.';$('#fact-calls').textContent=format.format(calls);$('#fact-answered').textContent=format.format(answered);$('#fact-customers').textContent=format.format(customers);$('#roi-chart-bar').style.width=recovery+'%';window.dispatchEvent(new CustomEvent('aiforeu:roi',{detail:{calls,answered,customers,revenue,recovery,conversion:conv}}));}inputs.forEach(e=>e.addEventListener('input',update));roi.addEventListener('submit',e=>e.preventDefault());update();}
// One FAQ source drives list, structured data and the text assistant.
const faqData=$('#faq-data');
if(faqData){const data=JSON.parse(faqData.textContent),search=$('#faq-search'),items=$$('.faq-item'),empty=$('.faq-empty'),count=$('#faq-count');const normalize=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');function filter(){const term=normalize(search.value.trim());let n=0;items.forEach((item,i)=>{item.hidden=!normalize(data[i].q+' '+data[i].a).includes(term);if(!item.hidden)n++;});empty.hidden=n!==0;count.textContent=term?n+' passende '+(n===1?'Frage':'Fragen'):data.length+' Fragen zu AIFOREU Voice';}search.addEventListener('input',filter);filter();
 const log=$('#chatlog');function message(text,user=false,fallback=false){const p=document.createElement('p');p.className='chat-bubble '+(user?'user':'bot');p.textContent=text;if(fallback){const a=document.createElement('a');a.href='pilot.html#kontakt';a.textContent='Frage mit dem Team besprechen';p.append(document.createElement('br'),a);}log.appendChild(p);log.scrollTop=log.scrollHeight;return p;}
 function answer(question,index){message(question,true);if(index>=0)changed(message(data[index].a));else{try{sessionStorage.setItem('gvFrage','Meine Frage: '+question);}catch{}changed(message('Diese Frage beantworten wir Ihnen persönlich. Ich habe sie für Ihre Pilotanfrage vorgemerkt.',false,true));}}
 $$('[data-question]').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.question);answer(data[i].q,i);}));
 function route(s){const t=normalize(s);const rules=[[/kalender|\bcrm\b|integration|fachverfahren|bestandskontakt/,10],[/kosten|preis|paket|lizenz|monatlich/,9],[/datenschutz|dsgvo|daten|hosting|server|sicher|training|losch/,4],[/nummer|telefonanlage|anlage|ruckfall/,5],[/dauer|schnell|wann|wie lange|start|pilot/,1],[/quelle|wissen|website|inhalt|bereitstell/,2],[/fur wen|branche|geeignet|organisation|unternehmen/,0],[/nicht beantworten|weiss nicht|mensch|mitarbeiter|ubergabe|eskalation|keine antwort/,3],[/naturlich|roboter|stimme|klingt|unterbrech/,6],[/parallel|gleichzeitig|besetzt|warteschleife|ansturm/,7],[/auswert|transkript|statistik|protokoll|report/,8]];for(const [re,i]of rules)if(re.test(t))return i;return -1;}
 $('#chatform').addEventListener('submit',e=>{e.preventDefault();const input=$('#chatinput'),text=input.value.trim();if(!text)return;input.value='';answer(text,route(text));});
}
const cf=$('#cf-msg');
if(cf){
 try{const question=sessionStorage.getItem('gvFrage');if(question&&!cf.value)cf.value=question;}catch{}
 const form=cf.closest('form'),error=$('#cf-error'),submit=$('.cf-submit',form);
 const errors={invalid:'Bitte prüfen Sie Ihre Angaben.',unavailable:'Der Versand ist noch nicht eingerichtet. Bitte schreiben Sie an contact@aiforgov.eu.',delivery:'Die Anfrage konnte nicht versendet werden. Bitte versuchen Sie es später erneut.'};
 function showError(message){error.textContent=message;error.hidden=false;error.focus({preventScroll:true});}
 const code=new URLSearchParams(location.search).get('form-error');if(errors[code])showError(errors[code]);
 form.addEventListener('submit',async event=>{
  if(!form.checkValidity())return;
  if(new URL(form.action).pathname!=='/api/pilot')return;
  event.preventDefault();if(submit.disabled)return;error.hidden=true;submit.disabled=true;submit.textContent='Wird gesendet …';
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);let serverMessage;
  try{
   const response=await fetch(form.action,{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams(new FormData(form)),signal:controller.signal});
   const result=await response.json();if(!response.ok||!result.ok){serverMessage=typeof result.message==='string'?result.message:errors.delivery;throw new Error('requestFailed');}
   try{sessionStorage.removeItem('gvFrage');}catch{}
   location.assign('danke.html');
  }catch(reason){showError(reason.name==='AbortError'?'Der Versand konnte nicht bestätigt werden. Ihre Angaben bleiben erhalten. Bitte versuchen Sie es später erneut.':serverMessage||errors.delivery);}
  finally{clearTimeout(timeout);submit.disabled=false;submit.textContent='Pilotanfrage senden';}
 });
}
})();
