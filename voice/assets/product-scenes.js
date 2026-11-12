/* Independent local product studies. Native scroll, reversible poses, finite interactions. */
(() => {
 'use strict';
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const clamp = n => Math.max(0,Math.min(1,n));
 const ease = n => { const t=clamp(n); return t*t*(3-2*t); };
 const mix = (a,b,t) => a+(b-a)*t;
 const step = (p,a,b) => ease((p-a)/(b-a));
 const bezier = (a,b,c,d,t) => (1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d;
 const opacity = (node,value) => { node.style.opacity=clamp(value).toFixed(4); node.style.visibility=value<.002?'hidden':'visible'; };
 const controllers=[];
 let frame=0, measuring=false, printing=false;

 function calendar(root) {
  const board=root.querySelector('.calendar-board'), packet=root.querySelector('.appointment-packet');
  const days=[...root.querySelectorAll('.calendar-day')], request=root.querySelector('.appointment-request'), event=root.querySelector('.appointment-event');
  const receipt=root.querySelector('.calendar-confirmation'), shadow=root.querySelector('.calendar-shadow'), orbit=root.querySelector('.appointment-orbit');
  return {travel:1.8,draw(p,w,h){
   const mobile=w<700, bw=Math.min(1000,w-(mobile?44:100)), bh=mobile?380:430;
   const unfold=step(p,.08,.48), dock=step(p,.38,.84), seal=step(p,.82,.97);
   const by=h*(mobile?.49:.52);
   board.style.transform=`translate(-50%,-50%) translateY(${mix(180,0,unfold)}px) rotateX(${mix(66,0,unfold)}deg) rotateZ(${mix(-12,0,unfold)}deg) scale(${mix(.72,1,unfold)})`;
   opacity(board,step(p,.04,.17)); opacity(shadow,unfold*.4);
   days.forEach((day,i)=>{const leaf=step(p,.07+i*.034,.38+i*.034);day.style.transform=`rotateY(${(1-leaf)*-78}deg)`;});
   const gutter=mobile?35:48, cell=(bw-gutter)/(mobile?3:5);
   const targetX=(w-bw)/2+gutter+(mobile?1:3)*cell+cell/2, targetY=by-bh/2+(mobile?55+40:65+47)+(bh-(mobile?95:112))*.55;
   const fromX=w*(mobile?.5:.69),fromY=h*(mobile?.46:.48),pw=mix(mobile?270:310,cell-(mobile?6:14),dock),ph=mix(mobile?120:132,mobile?79:88,dock);
   const x=bezier(fromX,fromX+w*.12,targetX-w*.15,targetX,dock),y=bezier(fromY,fromY-100,targetY-100,targetY,dock);
   packet.style.width=`${pw}px`;packet.style.height=`${ph}px`;packet.style.borderRadius=`${mix(24,7,dock)}px`;
   packet.style.transform=`translate(${x-pw/2}px,${y-ph/2}px) rotateZ(${Math.sin(dock*Math.PI)*-9}deg) translateZ(${mix(180,3,dock)}px) rotateY(${Math.sin(dock*Math.PI)*16}deg)`;
   opacity(request,1-step(dock,.12,.52));opacity(event,step(dock,.44,.75));opacity(orbit,(1-step(p,.14,.42))*.22);
   orbit.style.transform=`rotate(${p*95}deg) scale(${mix(.72,1.2,step(p,0,.4))})`;
   opacity(receipt,seal);receipt.style.transform=`translateY(${(1-seal)*22}px) scale(${mix(.94,1,seal)})`;
  }};
 }

 function knowledge(root) {
  const docs=[...root.querySelectorAll('.knowledge-document')],tabs=[...root.querySelectorAll('.knowledge-tab')];
  const data=JSON.parse(root.querySelector('.knowledge-data').textContent),answer=root.querySelector('.knowledge-answer'),excerpt=root.querySelector('.knowledge-excerpt');
  const route=root.querySelector('.knowledge-route'),paths=[...route.querySelectorAll('path')],signal=root.querySelector('.knowledge-signal');
  let selected=1,visualSelection=1,transitionFrame=0,flight=1,lastP=0,lastW=0,lastH=0,interacted=false,tiltX=0,tiltY=0;
  const model={travel:1.35,draw(p,w,h){
   lastP=p;lastW=w;lastH=h;
   const mobile=w<700,open=interacted?1:step(p,.04,.36),cx=w*(mobile?.5:.32),cy=h*(mobile?.49:.54),dw=mobile?235:320,dh=mobile?305:370;
   const tabScale=mobile?Math.min(1,(w-60)/326):1,tabWidths=(mobile?[92,136,98]:[125,164,135]).map(n=>n*tabScale),total=tabWidths.reduce((a,b)=>a+b,0)+16;
   let tabX=mobile?(w-total)/2:cx-total/2;
   tabs.forEach((tab,i)=>{tab.style.left=`${tabX}px`;tab.style.width=`${tabWidths[i]}px`;tabX+=tabWidths[i]+8;});
   docs.forEach((doc,i)=>{
    const offset=i-visualSelection,hot=1-clamp(Math.abs(offset)),spread=(mobile?47:95)*open;
    const x=cx+offset*spread-dw/2,y=cy-dh/2+Math.abs(offset)*(mobile?16:20)*open+(1-open)*70;
    doc.style.zIndex=String(4+Math.round(hot*3));
    doc.style.transform=`translate(${x}px,${y}px) rotateX(${(1-open)*55+tiltY*hot}deg) rotateY(${offset*8*open+tiltX*hot}deg) rotateZ(${offset*9*open}deg) scale(${mix(.88,1,hot)})`;
    opacity(doc,mix(.9,1,hot));
    doc.querySelector('.document-scan').style.transform=`scaleX(${i===selected?step(flight,0,.45)*open:0})`;
   });
   const answerIn=step(p,.22,.48),sx=cx+dw*.15,sy=cy+dh*.19,ex=mobile?w*.5:w-Math.max(28,(w-1200)/2)-170,ey=mobile?h-answer.offsetHeight-55+65:h*.46+110;
   route.setAttribute('viewBox',`0 0 ${w} ${h}`);
   const d=mobile?`M${sx} ${sy}C${sx} ${sy+70},${ex} ${ey-60},${ex} ${ey}`:`M${sx} ${sy}C${sx+160} ${sy},${ex-160} ${ey},${ex} ${ey}`;
   paths.forEach(path=>path.setAttribute('d',d));const length=signal.getTotalLength();signal.style.strokeDasharray=String(length);signal.style.strokeDashoffset=String(length*(1-step(flight,.12,.7)));
   opacity(route,open*answerIn);opacity(answer,interacted?1:answerIn);
   answer.style.transform=`translateY(${(1-(interacted?1:answerIn))*25}px)`;
   const t=step(flight,.10,.88),x=bezier(sx,sx+(mobile?20:130),ex-(mobile?20:130),ex,t),y=bezier(sy,sy-(mobile?-40:70),ey-65,ey,t);
   excerpt.style.transform=`translate(${x-excerpt.offsetWidth/2}px,${y-excerpt.offsetHeight/2}px) rotate(${mix(-5,0,t)}deg) scale(${mix(.92,1,t)})`;
   opacity(excerpt,reduced.matches?0:step(flight,.06,.2)*(1-step(flight,.73,.91)));
  }};
  function render(){if(lastW)model.draw(lastP,lastW,lastH);}
  function choose(index){
   if(index===selected&&interacted)return;
   selected=index;interacted=true;tabs.forEach((tab,i)=>tab.setAttribute('aria-pressed',String(i===index)));
   answer.querySelector('p').textContent=data[index].answer;answer.querySelector('.answer-citation span').textContent=data[index].name;excerpt.textContent=data[index].quote;
   cancelAnimationFrame(transitionFrame);
   if(reduced.matches){visualSelection=index;flight=1;render();return;}
   const from=visualSelection,began=performance.now();flight=0;
   function tick(now){const t=clamp((now-began)/1050);visualSelection=mix(from,index,ease(t/.72));flight=t;render();transitionFrame=t<1?requestAnimationFrame(tick):0;}
   transitionFrame=requestAnimationFrame(tick);
  }
  tabs.forEach((tab,i)=>{
   tab.addEventListener('click',()=>choose(i));
   tab.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')choose(i);});
   tab.addEventListener('focus',()=>choose(i));
   tab.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const n=event.key==='Home'?0:event.key==='End'?2:(i+(event.key==='ArrowRight'?1:2))%3;tabs[n].focus();}});
  });
  const sources=root.querySelector('.knowledge-sources');
  sources.addEventListener('pointermove',event=>{if(reduced.matches||event.pointerType!=='mouse')return;const box=sources.getBoundingClientRect();tiltX=clamp((event.clientX-box.left)/box.width)*5-2.5;tiltY=(clamp((event.clientY-box.top)/box.height)-.5)*-4;render();},{passive:true});
  sources.addEventListener('pointerleave',()=>{tiltX=tiltY=0;render();});
  model.stop=()=>{cancelAnimationFrame(transitionFrame);transitionFrame=0;visualSelection=selected;flight=1;tiltX=tiltY=0;render();};
  return model;
 }

 function journey(root){
  const world=root.querySelector('.journey-world'),stations=[...root.querySelectorAll('.journey-station')],packet=root.querySelector('.journey-packet'),rail=root.querySelector('.rail-active');
  const length=rail.getTotalLength(),ys=[320,260,350,250,320];rail.style.strokeDasharray=String(length);
  stations.forEach((station,i)=>{station.style.left=`${260+i*500-140}px`;station.style.top=`${ys[i]-208}px`;});
  return {travel:3,draw(p,w,h){
   const mobile=w<700,route=step(p,.13,.88),dive=step(p,0,.18),exit=mobile?0:step(p,.89,1),overview=Math.min(w/2850,.53);
   const scale=mix(mix(overview,mobile?.98:1.25,dive),overview,exit),index=route*4,near=Math.round(index),point=rail.getPointAtLength(length*route);
   const pitch=mix(mix(44,9,dive),35,exit),roll=mix(mix(-10,0,dive),-5,exit),r=roll*Math.PI/180,tilt=pitch*Math.PI/180;
   const targetX=mix(mix(1260,point.x,dive),1260,exit),targetY=mix(310,point.y,dive);
   const rotatedX=targetX*Math.cos(r)-targetY*Math.sin(r),rotatedY=(targetX*Math.sin(r)+targetY*Math.cos(r))*Math.cos(tilt);
   const tx=w*.5-rotatedX*scale,ty=h*(mobile?.58:.61)-rotatedY*scale;
   world.style.transform=`translate(${tx}px,${ty}px) scale(${scale}) rotateX(${pitch}deg) rotateZ(${roll}deg)`;
   rail.style.strokeDashoffset=String(length*(1-route));
   packet.style.transform=`translate(${point.x-27}px,${point.y-27}px) translateZ(55px)`;
   stations.forEach((station,i)=>{
    const attention=mix(1,1-clamp(Math.abs(index-i)*.8),dive*(1-exit));
    station.classList.toggle('station-current',near===i&&dive>.35);
    station.querySelector('.station-screen').style.transform=`translateZ(${mix(20,48,attention)}px) rotateX(${mix(-16,0,attention)}deg)`;
    opacity(station,mix(.38,1,attention));
   });
  }};
 }

 function handoff(root){
  const fragments=[...root.querySelectorAll('.handoff-fragment')],envelope=root.querySelector('.handoff-envelope'),flap=root.querySelector('.envelope-flap'),content=root.querySelector('.envelope-content'),task=root.querySelector('.handoff-task');
  const fields=[...root.querySelectorAll('.task-fields>div')],input=root.querySelector('.handoff-input-symbol'),team=root.querySelector('.handoff-team-symbol');
  return {travel:2.05,draw(p,w,h){
   const mobile=w<700,fw=mobile?280:340,ew=mobile?280:330,eh=mobile?180:205,assemble=step(p,.05,.42),close=step(p,.38,.59),transfer=step(p,.56,.82),arrive=step(p,.76,.98);
   const startX=w*(mobile?.43:.29),endX=w*(mobile?.66:.73),cy=h*.56;
   fragments.forEach((piece,i)=>{const gather=step(p,.07+i*.05,.37+i*.03),fromX=startX+[25,-15,15][i],fromY=cy+(i-1)*(mobile?99:122);
    piece.style.transform=`translate(${mix(fromX,startX,gather)-fw/2}px,${mix(fromY,cy-55,gather)}px) rotate(${mix([-7,4,-3][i],0,gather)}deg) scale(${mix(1,.85,gather)})`;
    opacity(piece,1-step(p,.37+i*.025,.50+i*.025));});
   const x=bezier(startX,startX+w*.2,endX-w*.15,endX,transfer),y=cy+bezier(0,-85,-115,0,transfer);
   envelope.style.transform=`translate(${x-ew/2}px,${y-eh/2}px) rotateZ(${Math.sin(transfer*Math.PI)*-8}deg) rotateY(${Math.sin(transfer*Math.PI)*20}deg) scale(${mix(1,.76,transfer)})`;
   opacity(envelope,step(p,.25,.40)*(1-step(p,.83,.94)));
   flap.style.transform=`translateZ(5px) rotateX(${mix(180,0,close)}deg)`;
   content.style.transform=`translateZ(2px) translateY(${mix(-50,0,step(p,.28,.5))}px)`;
   const tw=Math.min(370,mobile?w-44:370),th=task.offsetHeight,taskX=mobile?w/2:endX;
   task.style.transform=`translate(${taskX-tw/2}px,${h*.55-th/2+(1-arrive)*25}px) rotateY(${(1-arrive)*-22}deg) scale(${mix(.91,1,arrive)})`;
   task.style.clipPath=`inset(${(1-arrive)*100}% 0 0 0 round 16px)`;opacity(task,arrive);
   fields.forEach((field,i)=>{const t=step(p,.80+i*.035,.91+i*.035);field.style.transform=`translateY(${(1-t)*13}px)`;opacity(field,t);});
   opacity(input,1-step(p,.15,.38));opacity(team,1-step(p,.76,.9));
  }};
 }

 const factories={calendar,knowledge,journey,handoff};
 document.querySelectorAll('[data-product-scene]').forEach(root=>{
  const factory=factories[root.dataset.productScene];if(!factory)return;
  const model=Object.assign(factory(root),{root,track:root.querySelector('.scene-track'),stage:root.querySelector('.scene-stage'),visible:false,p:-1,w:0,h:0,start:0,range:1});
  root.classList.add('scene-ready');controllers.push(model);
 });
 function measure(){
  measuring=true;
  const header=document.querySelector('.site-header')?.offsetHeight||0,vh=Math.max(640,innerHeight-header);
  controllers.forEach(model=>{
   const pinned=!reduced.matches&&!printing&&innerHeight>=700;
   model.track.classList.toggle('is-pinned',pinned);model.root.classList.toggle('scene-static',!pinned);model.pinned=pinned;
   model.root.style.setProperty('--scene-vh',`${vh}px`);model.root.style.setProperty('--scene-top',`${header}px`);
   model.range=Math.round((innerHeight-header)*model.travel);model.root.style.setProperty('--scene-travel',`${model.range}px`);
   model.w=model.stage.clientWidth;model.h=model.stage.clientHeight;model.start=model.track.getBoundingClientRect().top+scrollY-header;
   model.p=-1;
  });
  measuring=false;schedule();
 }
 function draw(){
  frame=0;if(document.hidden)return;
  controllers.forEach(model=>{
   if(!model.visible&&model.p>=0)return;
   const p=!model.pinned||reduced.matches||printing?1:clamp((scrollY-model.start)/model.range);
   if(p===model.p)return;
   model.p=p;model.root.dataset.sceneProgress=p.toFixed(4);model.root.classList.toggle('scene-engaged',p>.13&&model.pinned&&!reduced.matches);
   model.draw(p,model.w,model.h);
  });
 }
 function schedule(){if(!frame&&!document.hidden)frame=requestAnimationFrame(draw);}
 const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{const model=controllers.find(x=>x.root===entry.target);model.visible=entry.isIntersecting;if(!entry.isIntersecting)model.stop?.();});schedule();},{rootMargin:'100px'});
 controllers.forEach(model=>observer.observe(model.root));
 if(controllers.length){
  measure();
  const resize=new ResizeObserver(()=>{if(!measuring)measure();});controllers.forEach(model=>resize.observe(model.stage));resize.observe(document.querySelector('main'));
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',measure,{passive:true});
  reduced.addEventListener('change',()=>{controllers.forEach(model=>model.stop?.());measure();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;controllers.forEach(model=>model.stop?.());}else schedule();});
  window.addEventListener('beforeprint',()=>{printing=true;measure();draw();});window.addEventListener('afterprint',()=>{printing=false;measure();});
 }

 // A hundred weighted blocks show proportions of the actual calculated volume.
 const roi=document.querySelector('.roi-motion');
 if(roi){
  const stage=roi.querySelector('.roi-motion-stage'),canvas=roi.querySelector('canvas'),ctx=canvas.getContext('2d');
  const format=new Intl.NumberFormat('de-DE',{maximumFractionDigits:0});
  let width=0,height=0,ratio=1,values=null,animation=0,began=0,visible=true;
  let revenueMotion;
  let points=Array.from({length:100},()=>({x:0,y:0,group:0})),from=[],targets=[];
  const styles=getComputedStyle(roi),colors={dark:styles.getPropertyValue('--dark').trim(),paper:styles.getPropertyValue('--paper').trim(),soft:styles.getPropertyValue('--accent-soft').trim(),tint:styles.getPropertyValue('--accent-tint').trim()};
  function targetPoints(){
   const counts=[0,0,0],unit=Math.min(width/32,18),volume=Math.min(1.5,.48+.52*Math.sqrt(values.calls/(9*4.33)));
   return Array.from({length:100},(_,i)=>{
    const group=i<100-values.recovery?0:i<100-values.recovery*values.conversion/100?1:2,n=counts[group]++,col=n%4,row=Math.floor(n/4)%4,level=Math.floor(n/16);
    return {x:width*(.17+group*.33)+(col-row)*unit,y:height*.5+(col+row)*unit*.5-level*unit*1.05*volume,volume,depth:col+row+level*.01,group};
   });
  }
  function cube(x,y,size,group,alpha=1,volume=1){
   const half=size*.5,rise=size*1.05*volume;
   ctx.globalAlpha=alpha;
   ctx.fillStyle=group===0?colors.soft:group===1?colors.dark:colors.paper;
   ctx.strokeStyle=group===0?colors.soft:colors.dark;ctx.lineWidth=.7;
   ctx.beginPath();ctx.moveTo(x,y-rise);ctx.lineTo(x+size,y+half-rise);ctx.lineTo(x,y+size-rise);ctx.lineTo(x-size,y+half-rise);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle=group===1?colors.dark:colors.tint;
   ctx.beginPath();ctx.moveTo(x-size,y+half-rise);ctx.lineTo(x,y+size-rise);ctx.lineTo(x,y+size);ctx.lineTo(x-size,y+half);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle=group===0?colors.soft:group===1?colors.dark:colors.soft;
   ctx.beginPath();ctx.moveTo(x,y+size-rise);ctx.lineTo(x+size,y+half-rise);ctx.lineTo(x+size,y+half);ctx.lineTo(x,y+size);ctx.closePath();ctx.fill();ctx.stroke();
  }
  function paint(){
   if(!ctx||!width)return;
   ctx.clearRect(0,0,width,height);const unit=Math.min(width/32,18);
   for(let group=0;group<3;group++){
    const cx=width*(.17+group*.33),cy=height*.5;
    ctx.globalAlpha=.35;ctx.strokeStyle=colors.soft;ctx.lineWidth=.7;
    for(let row=0;row<=4;row++){
     ctx.beginPath();ctx.moveTo(cx-row*unit,cy+row*unit*.5);ctx.lineTo(cx+(4-row)*unit,cy+(row+4)*unit*.5);ctx.stroke();
     ctx.beginPath();ctx.moveTo(cx+row*unit,cy+row*unit*.5);ctx.lineTo(cx+(row-4)*unit,cy+(row+4)*unit*.5);ctx.stroke();
    }
   }
   [...points].sort((a,b)=>a.depth-b.depth).forEach(point=>cube(point.x,point.y,unit*.88,point.group,point.group===0?.55:1,point.volume));ctx.globalAlpha=1;
  }
  function finish(){cancelAnimationFrame(animation);animation=0;if(targets.length)points=targets.map(p=>({...p}));paint();}
  function animate(now){
   const t=clamp((now-began)/1100);
   points=targets.map((target,i)=>{const local=ease((t-(i%10)*.018)/.82),a=from[i],travel=Math.abs(a.x-target.x)>2;return {x:mix(a.x,target.x,local),y:mix(a.y,target.y,local)-(travel?Math.sin(local*Math.PI)*Math.min(85,width*.15):0),volume:mix(a.volume||1,target.volume,local),depth:mix(a.depth||0,target.depth,local),group:local>.45?target.group:a.group};});
   paint();animation=t<1?requestAnimationFrame(animate):0;
  }
  function setValues(value,instant=false){
   const first=!values;
   if(!first&&!instant&&!reduced.matches&&visible&&!document.hidden&&value.revenue!==values.revenue){
    revenueMotion?.cancel();revenueMotion=document.querySelector('#roi-rev')?.animate?.([{filter:'blur(3px)',transform:'translateY(5px)'},{filter:'blur(0)',transform:'translateY(0)'}],{duration:350,easing:'cubic-bezier(.16,1,.3,1)'});
   }
   values=value;
   roi.querySelector('[data-roi-missed]').textContent=format.format(value.calls-value.answered);
   roi.querySelector('[data-roi-answered]').textContent=format.format(value.answered-value.customers);
   roi.querySelector('[data-roi-orders]').textContent=format.format(value.customers);
   stage.dataset.answered=String(value.answered);stage.dataset.orders=String(value.customers);
   targets=targetPoints();
   if(first||instant||reduced.matches||!visible||document.hidden){finish();return;}
   cancelAnimationFrame(animation);from=points.map(point=>({...point}));began=performance.now();animation=requestAnimationFrame(animate);
  }
  function size(){
   width=stage.clientWidth;height=stage.clientHeight;ratio=Math.min(devicePixelRatio||1,2);
   canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx?.setTransform(ratio,0,0,ratio,0,0);
   if(values)setValues(values,true);
  }
  new ResizeObserver(size).observe(stage);size();
  window.addEventListener('aiforeu:roi',event=>setValues(event.detail));
  reduced.addEventListener('change',()=>{finish();revenueMotion?.cancel();});document.addEventListener('visibilitychange',()=>{if(document.hidden){finish();revenueMotion?.cancel();}});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)finish();else paint();}).observe(roi);
  canvas.addEventListener('contextlost',()=>{cancelAnimationFrame(animation);animation=0;});
 }
})();
