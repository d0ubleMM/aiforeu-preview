// Startseite: Partikelfeld, Zahlenszene, Produktwahl und Proben (aus dem Werkstatt-Entwurf „Die Aufgabe wählt das Werkzeug“)
(()=>{
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches,EASE='cubic-bezier(.22,1,.36,1)';
const wert=el=>(window.ablauf&&window.ablauf.wert)?window.ablauf.wert(el):(RM?1:0);
const sm=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
const prng=s=>()=>(s=s*16807%2147483647)/2147483647;
const anim=(el,k,d=550)=>{if(!RM&&el.animate)el.animate(k,{duration:d,easing:EASE})};

/* Schrift abtasten (nur selbst gesetzter Text) */
function textPunkte(a,str,c,W,H,cy,maxFs){
 const o=document.createElement('canvas');o.width=Math.max(1,W|0);o.height=Math.max(1,H|0);const g=o.getContext('2d');
 const f=s=>`800 ${s}px "Schibsted Grotesk",sans-serif`;let fs=maxFs;g.font=f(fs);fs=Math.min(fs,fs*W*.86/g.measureText(str).width);
 g.font=f(fs);g.textAlign='center';g.textBaseline='middle';g.fillText(str,W/2,cy);
 const d=g.getImageData(0,0,o.width,o.height).data,s=Math.max(3,Math.round(fs/50));
 for(let y=0;y<o.height;y+=s)for(let x=0;x<o.width;x+=s)if(d[(y*o.width+x)*4+3]>140)a.push(x,y,c);
}
function packe(a,N,seed){
 const n=Math.max(1,a.length/3),r=prng(seed),x=new Float32Array(N),y=new Float32Array(N),c=new Uint8Array(N),idx=new Uint32Array(N);
 for(let i=0;i<N;i++)idx[i]=n>=N?Math.floor(i*n/N):(i<n?i:Math.floor(r()*n));
 for(let i=N-1;i>0;i--){const j=Math.floor(r()*(i+1)),t=idx[i];idx[i]=idx[j];idx[j]=t}
 for(let i=0;i<N;i++){const k=idx[i]*3;x[i]=(a[k]||0)+(r()-.5)*.8;y[i]=(a[k+1]||0)+(r()-.5)*.8;c[i]=a[k+2]||0}
 return{x,y,c};
}
const Lin=(a,x1,y1,x2,y2,s,c)=>{const n=Math.max(1,Math.round(Math.hypot(x2-x1,y2-y1)/s));for(let i=0;i<=n;i++)a.push(x1+(x2-x1)*i/n,y1+(y2-y1)*i/n,c)};
const Rec=(a,x,y,w,h,s,c)=>{for(let v=y;v<=y+h;v+=s)for(let u=x;u<=x+w;u+=s)a.push(u,v,c)};
const Kre=(a,cx,cy,r,s,c)=>{for(let v=-r;v<=r;v+=s)for(let u=-r;u<=r;u+=s)if(u*u+v*v<=r*r)a.push(cx+u,cy+v,c)};

/* Partikelfeld im Startbereich */
const feld=(()=>{
 const cv=$('#feld-canvas'),box=cv.parentElement,kap=cv.closest('[data-kapitel]'),ctx=cv.getContext('2d');
 const N=innerWidth<760?1100:2600,px=new Float32Array(N),py=new Float32Array(N),dx=new Float32Array(N),dy=new Float32Array(N);
 const r0=prng(3);for(let i=0;i<N;i++){const a=r0()*6.283,m=.4+r0()*.6;dx[i]=Math.cos(a)*m;dy[i]=Math.sin(a)*m}
 const F=['rgba(250,250,247,.92)','#E8352B','#F5B800','#1E9E5A','rgba(250,250,247,.36)'];
 let W=0,H=0,formen={},sel='auto',sicht=true,still=0,erst=true;
 const bau={
  // Automatisierung im Büro: eine Mail wird zu Zeilen in einer Tabelle, eine Zeile ist auffällig.
  auto(a){const s=3,ex=W*.08,ey=H*.3,ew=W*.26,eh=H*.3;
   Lin(a,ex,ey,ex+ew,ey,s,0);Lin(a,ex,ey+eh,ex+ew,ey+eh,s,0);Lin(a,ex,ey,ex,ey+eh,s,0);Lin(a,ex+ew,ey,ex+ew,ey+eh,s,0);
   Lin(a,ex,ey,ex+ew/2,ey+eh*.55,s,0);Lin(a,ex+ew,ey,ex+ew/2,ey+eh*.55,s,0);Kre(a,ex+ew-4,ey+4,9,2.2,1);
   const ay=ey+eh/2;for(let x=ex+ew+W*.03;x<W*.52;x+=20)Lin(a,x,ay,Math.min(x+11,W*.52),ay,2.5,4);Lin(a,W*.52-12,ay-9,W*.52,ay,2.5,0);Lin(a,W*.52-12,ay+9,W*.52,ay,2.5,0);
   const tx=W*.56,tw=W*.38,ty=H*.14,rh=H*.1,rows=7,cols=[0,.38,.6,.82,1];
   for(let r=0;r<=rows;r++)Lin(a,tx,ty+r*rh,tx+tw,ty+r*rh,3,4);for(const c of cols)Lin(a,tx+tw*c,ty,tx+tw*c,ty+rows*rh,3,4);
   for(let k=0;k<4;k++)Rec(a,tx+tw*cols[k]+8,ty+rh*.32,tw*(cols[k+1]-cols[k])*.62,7,2.2,0);
   const r0=prng(19);for(let r=1;r<rows;r++){const c=r===4?1:0;for(let k=0;k<4;k++){const x=tx+tw*cols[k]+8,w=tw*(cols[k+1]-cols[k])-16;Rec(a,x,ty+r*rh+rh*.38,w*(.45+r0()*.5),4,2.2,c)}
    if(r<6&&r!==4)Kre(a,tx+tw+16,ty+r*rh+rh/2,5,2,3);if(r===4)Kre(a,tx+tw+16,ty+r*rh+rh/2,5,2,1)}
   Rec(a,tx+tw*.82+8,ty+6*rh+rh*.38,tw*.1,4,2.2,2)},
  verkehrsos(a){const cx=W/2,cy=H*.47,rw=Math.min(W,H)*.16,r=rw*.45,zw=rw*.42,s=3;
   for(const sx of[-1,1])for(const sy of[-1,1]){const ox=cx+sx*(rw+r),oy=cy+sy*(rw+r);
    Lin(a,ox,cy+sy*rw,sx<0?0:W,cy+sy*rw,s,0);Lin(a,cx+sx*rw,oy,cx+sx*rw,sy<0?0:H,s,0);
    for(let i=0;i<=12;i++){const t=i/12*Math.PI/2;a.push(ox-sx*r*Math.cos(t),oy-sy*r*Math.sin(t),0)}
    const gx=cx+sx*(rw+r+18),gy=cy+sy*(rw+r+18);[1,2,3].forEach((c,k)=>Kre(a,gx,gy-11+k*11,4.5,2,c))}
   const dash=(x1,y1,x2,y2)=>{const L=Math.hypot(x2-x1,y2-y1);for(let d=0;d<L;d+=24){const e=Math.min(d+14,L);Lin(a,x1+(x2-x1)*d/L,y1+(y2-y1)*d/L,x1+(x2-x1)*e/L,y1+(y2-y1)*e/L,3,4)}};
   const g=rw+zw+20;dash(0,cy,cx-g,cy);dash(cx+g,cy,W,cy);dash(cx,0,cx,cy-g);dash(cx,cy+g,cx,H);
   for(let v=cy-rw+5;v<cy+rw-6;v+=11){Rec(a,cx-rw-zw-6,v,zw,5,2.5,0);Rec(a,cx+rw+6,v,zw,5,2.5,0)}
   for(let u=cx-rw+5;u<cx+rw-6;u+=11){Rec(a,u,cy-rw-zw-6,5,zw,2.5,0);Rec(a,u,cy+rw+6,5,zw,2.5,0)}
   const h=rw+zw+14;Rec(a,cx-h-4,cy+3,4,rw-6,2,1);Rec(a,cx+h,cy-rw+3,4,rw-6,2,1);Rec(a,cx-rw+3,cy-h-4,rw-6,4,2,1);Rec(a,cx+3,cy+h,rw-6,4,2,1)},
  voice(a){const r=prng(7),x0=W*.12,x1=W*.88,top=H*.12,h=H*.72/7;
   for(let i=0;i<7;i++){const li=i%2==0,w=(x1-x0)*(.5+r()*.25),x=li?x0:x1-w,y=top+i*h,c=i==5?1:i==6?3:li?4:0,n=r()>.45?2:1;
    for(let j=0;j<n;j++)Rec(a,x,y+j*13,j==n-1?w*(.45+r()*.45):w,4,2.2,c);const lx=li?x-12:x1+12;Lin(a,lx,y,lx,y+n*13-6,2.2,c)}},
  ive(a){const r=prng(11),g=W*.04,x0=W*.08,cw=(W*.84-g*2)/3,top=H*.16,bot=H*.84,kopf=[0,2,3];
   for(let k=0;k<3;k++){const x=x0+k*(cw+g);Rec(a,x,top,cw,10,2.4,kopf[k]);Lin(a,x,top+22,x,bot,3,4);Lin(a,x+cw,top+22,x+cw,bot,3,4);Lin(a,x,bot,x+cw,bot,3,4);
    for(let y=top+38;y<bot-14;y+=15){const ind=Math.floor(r()*3)*12;Rec(a,x+12+ind,y,(cw-24-ind)*(.25+r()*.7),3,2.4,0)}}},
  anyuse(a){const x0=W*.1,x1=W*.9,y1=H*.36,y2=H*.56,bh=H*.08,ay=H*.74;Rec(a,x0,y1,x1-x0,bh,3.2,0);Rec(a,x0,y2,Math.max(4,(x1-x0)*.0042),bh,2,1);
   Lin(a,x0,ay,x1,ay,3,4);for(let i=0;i<=10;i++){const x=x0+(x1-x0)*i/10;Lin(a,x,ay,x,ay+(i%5?8:16),2.5,4)}Lin(a,x0-14,y1-20,x0-14,y2+bh+20,3,4)}
 };
 function raster(){const a=[],g=12,x0=W*.06,y0=H*.08,w=W*.88,h=H*.84,c1=w*7/12-g/2,c2=w-c1-g,rh=(h-g)/2;
  [[x0,y0,c1,'voice'],[x0+c1+g,y0,c2,'verkehrsos'],[x0,y0+rh+g,c2,'ive'],[x0+c2+g,y0+rh+g,c1,'anyuse']].forEach(([x,y,ww,id])=>{const c=id===sel?1:0;
   Lin(a,x,y,x+ww,y,3,c);Lin(a,x,y+rh,x+ww,y+rh,3,c);Lin(a,x,y,x,y+rh,3,c);Lin(a,x+ww,y,x+ww,y+rh,3,c);Rec(a,x+10,y+10,ww-20,rh-20,9,4)});
  formen.raster=packe(a,N,99)}
 function baue(){W=cv.clientWidth;H=cv.clientHeight;if(!W||!H)return;const d=Math.min(devicePixelRatio||1,2);
  cv.width=W*d;cv.height=H*d;ctx.setTransform(d,0,0,d,0,0);let s=5;
  for(const k in bau){const a=[];bau[k](a);formen[k]=packe(a,N,s++)}
  const t=[];textPunkte(t,'AIFOREU',0,W,H,H/2,H*.3);formen.text=packe(t,N,21);raster();
  if(erst){const r=prng(5);for(let i=0;i<N;i++){px[i]=r()*W;py[i]=r()*H}erst=false}still=0}
 function ziel(p){const S=formen[sel],T=formen.text,G=formen.raster;
  if(p<.3)return[S,S,0];if(p<.46)return[S,T,sm((p-.3)/.16)];if(p<.66)return[T,T,0];if(p<.82)return[T,G,sm((p-.66)/.16)];return[G,G,0]}
 function bild(){requestAnimationFrame(bild);if(!sicht||!formen.text)return;
  const p=RM?0:wert(kap),[A,B,e]=ziel(p),bump=Math.sin(Math.PI*e)*Math.min(W,H)*.16,k=RM?1:.11;let bew=0;
  for(let i=0;i<N;i++){const ex=A.x[i]+(B.x[i]-A.x[i])*e+dx[i]*bump-px[i],ey=A.y[i]+(B.y[i]-A.y[i])*e+dy[i]*bump-py[i];px[i]+=ex*k;py[i]+=ey*k;bew+=Math.abs(ex)+Math.abs(ey)}
  if(bew<N*.02){if(still++>2)return}else still=0;
  ctx.clearRect(0,0,W,H);
  for(let f=0;f<5;f++){ctx.fillStyle=F[f];const s=f===4?1.6:2.1;for(let i=0;i<N;i++)if((e<.5?A.c[i]:B.c[i])===f)ctx.fillRect(px[i]-1,py[i]-1,s,s)}}
 new IntersectionObserver(es=>{sicht=es[0].isIntersecting;still=0}).observe(box);
 let rz=0;new ResizeObserver(()=>{cancelAnimationFrame(rz);rz=requestAnimationFrame(()=>formen.text&&baue())}).observe(box);
 document.fonts.ready.then(()=>{baue();requestAnimationFrame(bild);setTimeout(()=>{document.documentElement.dataset.fertig='1'},RM?0:1800)});
 return{form(id){sel=id;if(W)raster();still=0}};
})();

/* Zerfallen: 15,8 s wird zu 66,6 ms */
(()=>{
 // Im dunklen Stil helle Punkte und das hellere Akzentrot.
 const DUNKEL=document.body.classList.contains('dunkel'),ROT=DUNKEL?'#FF4A3D':'#E8352B',GRAU=DUNKEL?'rgba(241,242,240,.42)':'rgba(17,17,17,.36)';
 const cv=$('#zahl-canvas'),kap=cv.closest('[data-kapitel]'),ctx=cv.getContext('2d'),N=innerWidth<760?1300:3000;
 const ph=new Float32Array(N),r0=prng(17);for(let i=0;i<N;i++)ph[i]=r0();
 let W,H,A,B,C,sicht=true,letzt=-1;
 function baue(){W=cv.clientWidth;H=cv.clientHeight;if(!W||!H)return;const d=Math.min(devicePixelRatio||1,2);cv.width=W*d;cv.height=H*d;ctx.setTransform(d,0,0,d,0,0);
  const a=[],b=[],c=[],r=prng(31);textPunkte(a,'15,8 s',0,W,H,H*.47,H*.34);textPunkte(b,'66,6 ms',1,W,H,H*.47,H*.34);
  for(let i=0;i<N;i++)c.push(W*(.04+r()*.92),H*(.26+r()*.4),0);A=packe(a,N,41);B=packe(b,N,43);C=packe(c,N,47);letzt=-1}
 function bild(){requestAnimationFrame(bild);if(!sicht||!A)return;const p=wert(kap);if(Math.abs(p-letzt)<.0004)return;letzt=p;
  let P=A,Q=A,e=0;if(p>=.28&&p<.5){Q=C;e=sm((p-.28)/.22)}else if(p>=.5&&p<.76){P=C;Q=B;e=sm((p-.5)/.26)}else if(p>=.76){P=B;Q=B}
  const rot=sm((p-.46)/.3);ctx.clearRect(0,0,W,H);
  for(const f of[0,1]){ctx.fillStyle=f?ROT:GRAU;for(let i=0;i<N;i++){if((ph[i]<rot)!==!!f)continue;ctx.fillRect(P.x[i]+(Q.x[i]-P.x[i])*e-1.2,P.y[i]+(Q.y[i]-P.y[i])*e-1.2,2.5,2.5)}}}
 new IntersectionObserver(es=>{sicht=es[0].isIntersecting;letzt=-1}).observe(cv);
 let rz=0;new ResizeObserver(()=>{cancelAnimationFrame(rz);rz=requestAnimationFrame(()=>A&&baue())}).observe(cv);
 document.fonts.ready.then(()=>{baue();requestAnimationFrame(bild)});
})();

/* Aufgabenwähler, Karten, Reiter */
const PROD={auto:['Automatisierung','Beispiel aus dem Büro'],voice:['AIFOREU Voice','Pilot anfragen'],verkehrsos:['VerkehrsOS','Pilotfähiger Prototyp'],ive:['IVE','Open Source · Mac-App'],anyuse:['AnyUse','Open Source · Alpha']};
const marke=$('.k-marke'),tabs=$$('[role=tab]');
function flip(el,aendern){const a=el.getBoundingClientRect();aendern();const b=el.getBoundingClientRect();
 if(b.width)anim(el,[{transform:`translate(${a.left-b.left}px,${a.top-b.top}px) scaleX(${a.width/b.width})`},{transform:'none'}],650)}
function strich(){const t=$('[role=tab][aria-selected=true]');if(t)$('.reiter-strich').style.transform=`translate(${t.offsetLeft}px,${t.offsetTop+t.offsetHeight-5}px) scaleX(${t.offsetWidth/100})`}
function zeigeTab(id,fokus){
 const neu=$('#probe-'+id),tausch=()=>{tabs.forEach(t=>{const an=t.dataset.tab===id;t.setAttribute('aria-selected',an);t.tabIndex=an?0:-1;if(an&&fokus)t.focus()});
  $$('.probe').forEach(p=>p.hidden=p!==neu);strich()};
 if(neu.hidden&&document.startViewTransition&&!RM)document.startViewTransition(tausch);else tausch()}
function waehle(id,fokus){
 $$('[data-wahl]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.wahl===id));
 $('#feld-produkt').textContent=PROD[id][0];$('#feld-status').textContent=PROD[id][1];
 anim($('.feld-legende'),[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],500);
 const fl=$('.feld-link');if(fl){fl.href=id==='auto'?'#automatisierung':'#werkbank';fl.textContent=id==='auto'?'Beispiel ansehen':'Probe öffnen'}
 feld.form(id);if(id==='auto')return;
 const k=$(`.karte[data-produkt="${id}"]`);flip(marke,()=>k.appendChild(marke));$$('.karte').forEach(x=>x.classList.toggle('ist-gewaehlt',x===k));
 zeigeTab(id,fokus)}
$$('[data-wahl]').forEach(b=>{b.addEventListener('click',()=>waehle(b.dataset.wahl));b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();waehle(b.dataset.wahl)}})});
tabs.forEach((t,i)=>{t.addEventListener('click',()=>waehle(t.dataset.tab));
 t.addEventListener('keydown',e=>{const d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(d){e.preventDefault();waehle(tabs[(i+d+tabs.length)%tabs.length].dataset.tab,true)}})});
addEventListener('resize',strich);document.fonts.ready.then(strich);strich();


/* Voice */
let uhr=[];const chips=$$('.schritte .chip'),setz=(c,z)=>{c.dataset.z=z;c.textContent=z};
const zurueck=()=>{uhr.forEach(clearTimeout);uhr=[];chips.forEach(c=>setz(c,'offen'))};
$$('.fall').forEach(b=>b.addEventListener('click',()=>{$$('.fall').forEach(x=>x.setAttribute('aria-pressed',x===b));$('#v-fall').textContent=b.textContent;zurueck()}));
$('#anruf').addEventListener('click',()=>{zurueck();const u=$('#uebergabe').checked;chips.forEach((c,i)=>uhr.push(setTimeout(()=>setz(c,i<2||u?'erledigt':'entfällt'),RM?0:400+i*650)))});

/* VerkehrsOS */
$$('.ebene-knopf').forEach(b=>b.addEventListener('click',()=>{const an=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',an);$(`.ebene[data-ebene="${b.dataset.ebene}"]`).style.opacity=an?1:0}));

/* IVE */
const Z={arbeitet:'arbeitet',wartet:'wartet auf Antwort',fertig:'fertig zur Prüfung'},K=Object.keys(Z);
const zaehle=()=>K.forEach(k=>$('#n-'+k).textContent=$$(`.sitzung[data-zustand="${k}"]`).length);
$$('.sitzung').forEach(s=>s.addEventListener('click',()=>{const n=K[(K.indexOf(s.dataset.zustand)+1)%3],c=$('.chip',s);s.dataset.zustand=n;c.dataset.z=n;c.textContent=Z[n];zaehle()}));

/* AnyUse */
const lauf=$('#lauf'),fmt=v=>v<1000?Math.round(v)+' ms':(v/1000).toFixed(1).replace('.',',')+' s';
function zeige(){const v=+lauf.value,b1=$('#b1'),b2=$('#b2'),q=Math.min(v/66.6,1);
 b1.style.transform=`scaleX(${v/15800})`;b2.style.transform=`scaleX(${q})`;b1.classList.toggle('voll',v>=15800);b2.classList.toggle('voll',q>=1);
 $('#o1').textContent=fmt(v);$('#o2').textContent=q>=1?'66,6 ms':Math.round(v)+' ms'}
lauf.addEventListener('input',zeige);
$('#lauf-los').addEventListener('click',()=>{if(RM){lauf.value=15800;return zeige()}const t0=performance.now();
 const s=t=>{const k=Math.min((t-t0)/3600,1);lauf.value=Math.round(k*15800);zeige();if(k<1)requestAnimationFrame(s)};requestAnimationFrame(s)});
const weiche=$('#weiche');$$('tbody button',weiche).forEach(b=>b.addEventListener('click',()=>{const an=b.getAttribute('aria-pressed')!=='true';
 $$('tbody button',weiche).forEach(x=>{x.setAttribute('aria-pressed',x===b&&an);x.closest('tr').classList.toggle('an',x===b&&an)});weiche.classList.toggle('gewaehlt',an)}));

/* Freigabe */
const fk=$('#fg-knopf'),fc=$('#fg-chip');fk.addEventListener('click',()=>{const an=fk.getAttribute('aria-pressed')!=='true';fk.setAttribute('aria-pressed',an);
 fc.dataset.z=an?'erledigt':'wartet';fc.textContent=an?'übernommen':'wartet';fk.textContent=an?'Zurücknehmen':'Freigeben';anim(fc,[{transform:'scale(.85)'},{transform:'none'}],450)});

/* Standorte */
$$('.station').forEach(b=>b.addEventListener('click',()=>{const o=b.dataset.ort;$$('.station').forEach(x=>x.setAttribute('aria-pressed',x===b));
 $$('dl [data-ort]').forEach(e=>e.classList.toggle('aktiv',e.dataset.ort===o));$('#lp-adresse').textContent=$(`dd[data-ort="${o}"]`).textContent}));

/* Platzhalter: auf der Startseite die VerkehrsOS-Probe zeigen, in der er steht */
// Nur wenn ein Produkt gewählt ist, auf VerkehrsOS wechseln; beim Büro-Beispiel bleibt die Auswahl, sein Platzhalter steht oben.
let vorPh=null;document.getElementById('platzhalter')?.addEventListener('click',()=>{const an=!document.documentElement.classList.contains('zeige-platzhalter'),jetzt=$('[data-wahl][aria-pressed=true]')?.dataset.wahl||'auto';
 if(an){vorPh=jetzt;if(jetzt!=='auto')waehle('verkehrsos')}else if(vorPh&&vorPh!==jetzt){waehle(vorPh);vorPh=null}},true);
})();
