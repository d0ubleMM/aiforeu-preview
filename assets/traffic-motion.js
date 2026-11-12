/* Real LGLN aerial imagery + public OSM geometry, with a choreographed reveal.
   This is a visual demonstration, not a live analysis of the imagery. */
(() => {
  'use strict';
  const clamp = n => Math.max(0,Math.min(1,n));
  const ease = n => {n=clamp(n);return n*n*(3-2*n);};
  const lerp = (a,b,t) => a+(b-a)*t;
  const zoom = (a,b,t) => Math.exp(lerp(Math.log(a),Math.log(b),t));
  const readImage = src => new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});
  function pathData(feature,index) {
    const points=feature.points;
    const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
    const line=new Path2D();line.moveTo(...points[0]);points.slice(1).forEach(p=>line.lineTo(...p));
    return {...feature,line,lengths,length:lengths.reduce((a,b)=>a+b,0),delay:(index%19)*.065};
  }
  function pointAt(path,progress) {
    let remain=clamp(progress)*path.length;
    for(let i=0;i<path.lengths.length;i++){
      const n=path.lengths[i];if(!n)continue;
      if(remain<=n || i===path.lengths.length-1)return [lerp(path.points[i][0],path.points[i+1][0],clamp(remain/n)),lerp(path.points[i][1],path.points[i+1][1],clamp(remain/n))];
      remain-=n;
    }
    return path.points[path.points.length-1];
  }
  function trace(ctx,path,start,end) {
    if(end<=start)return;
    ctx.beginPath();ctx.moveTo(...pointAt(path,start));let cursor=0;
    for(let i=0;i<path.lengths.length;i++){cursor+=path.lengths[i];const p=cursor/path.length;if(p>start&&p<end)ctx.lineTo(...path.points[i+1]);}
    ctx.lineTo(...pointAt(path,end));ctx.stroke();
  }
  document.querySelectorAll('[data-traffic-motion]').forEach(host=>{
    const canvas=host.querySelector('canvas'),button=host.querySelector('button');
    let ctx;try{ctx=canvas.getContext('2d',{alpha:false});}catch{return;}if(!ctx)return;
    const preference=matchMedia('(prefers-reduced-motion: reduce)');
    let width=0,height=0,dpr=1,visible=false,paused=false,raf=0,last=0,time=0,data=null,loading=false,paths=[];
    function render(seconds){
      if(!data||!width||!height)return;
      const t=seconds%18;
      const first=ease((t-1.15)/.78),second=ease((t-2.35)/.67),out=ease((t-16.6)/1.4);
      const centre=data.frames[0].center;
      let viewWidth=zoom(18000,2500,first);viewWidth=zoom(viewWidth,520,second);viewWidth=zoom(viewWidth,18000,out);
      const centreMix=first*(1-out),cx=lerp(centre[0]-data.focus[0],0,centreMix),cy=lerp(data.focus[1]-centre[1],0,centreMix);
      // The photos share geographic coordinates, so there is no switch to a different intersection.
      const scale=Math.max(width/viewWidth,height/(viewWidth*.6875));
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#0b1721';ctx.fillRect(0,0,width,height);
      ctx.translate(width/2,height/2);ctx.scale(scale,scale);ctx.translate(-cx,-cy);
      data.frames.forEach((f,i)=>{
        let opacity=i===0?1:i===1?ease((first-.48)/.4):ease((second-.43)/.42);
        if(i)opacity*=1-out;if(!opacity)return;
        ctx.globalAlpha=opacity;
        ctx.drawImage(f.image,f.bounds[0]-data.focus[0],data.focus[1]-f.bounds[3],f.width,f.height);
      });ctx.globalAlpha=1;
      const reveal=ease((t-3.7)/2.1)*(1-ease((t-15.8)/.8));
      if(reveal>0){
        const unit=1/scale;
        // Fade the photograph into linework without changing its geographic registration.
        ctx.fillStyle=`rgba(237,242,244,${reveal*.985})`;ctx.fillRect(cx-width/scale/2,cy-height/scale/2,width/scale,height/scale);
        paths.forEach((p,index)=>{
          const progress=clamp((t-4.1-p.delay)/(p.kind==='building'?1.8:2.7));
          if(!progress)return;
          const main=['primary','secondary','tertiary','primary_link','secondary_link'].includes(p.class);
          if(p.kind==='building'){ctx.globalAlpha=reveal*.94;ctx.fillStyle='#fbfcfd';ctx.fill(p.line);}
          else{ctx.globalAlpha=reveal*.8;ctx.strokeStyle='#d0dce1';ctx.lineWidth=(main?17:3.2);ctx.stroke(p.line);}
          ctx.strokeStyle=p.kind==='building'?'#a5b8c2':main?'#4c798c':'#8caab6';
          ctx.lineWidth=(p.kind==='building'?.65:main?1.7:.85)*unit;
          ctx.globalAlpha=reveal*(p.kind==='building'?.72:main?1:.6);
          trace(ctx,p,0,progress);
          if(progress<1){const point=pointAt(p,progress);ctx.fillStyle='#284d60';ctx.globalAlpha=reveal;ctx.fillRect(point[0]-1.4*unit,point[1]-1.4*unit,2.8*unit,2.8*unit);}
          if(t>8&&p.kind==='road'&&main){const cursor=((t-8)*.16+index*.137)%1;ctx.globalAlpha=reveal;ctx.lineWidth=3*unit;ctx.strokeStyle='#c9764e';trace(ctx,p,Math.max(0,cursor-.045),cursor);}
        });
        // Ground-aligned crosshairs and moving strokes support the reveal; they are illustrative.
        ctx.globalAlpha=reveal*.5;ctx.strokeStyle='#648b9e';ctx.lineWidth=.6*unit;
        paths.filter(p=>p.kind==='building').forEach((p,index)=>{
          if(index%3 || t<5+p.delay)return;const [x,y]=p.points[0],r=4*unit;
          ctx.beginPath();ctx.moveTo(x-r,y);ctx.lineTo(x+r,y);ctx.moveTo(x,y-r);ctx.lineTo(x,y+r);ctx.stroke();
        });ctx.globalAlpha=1;
        if(t<8.5){const scan=-300+clamp((t-3.8)/4.7)*600;
          const band=ctx.createLinearGradient(scan-50,0,scan,0);band.addColorStop(0,'#728e9c00');band.addColorStop(1,'#728e9c16');ctx.fillStyle=band;ctx.fillRect(scan-50,-400,50,800);
          ctx.strokeStyle=`rgba(97,133,151,${reveal*.55})`;ctx.lineWidth=.65*unit;ctx.beginPath();ctx.moveTo(scan,-400);ctx.lineTo(scan,400);ctx.stroke();
        }
      }
      ctx.globalAlpha=1;ctx.setTransform(dpr,0,0,dpr,0,0);
      const shade=ctx.createRadialGradient(width/2,height/2,Math.min(width,height)*.33,width/2,height/2,Math.max(width,height)*.75);
      shade.addColorStop(0,'#06131d00');shade.addColorStop(1,`rgba(6,19,29,${.25*(1-reveal)})`);ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
      host.dataset.phase=t<2.35?'city':t<3.7?'junction':t<8?'reveal':'flow';
    }
    function tick(now){raf=0;if(!visible||document.hidden||paused||preference.matches||!data)return;if(last)time+=Math.min((now-last)/1000,.06);last=now;render(time);raf=requestAnimationFrame(tick);}
    function sync(){cancelAnimationFrame(raf);raf=0;last=0;if(!data)return;if(preference.matches){render(10);button.hidden=true;}else{button.hidden=false;if(visible&&!paused&&!document.hidden)raf=requestAnimationFrame(tick);}button.setAttribute('aria-label',paused?'Kartenanimation fortsetzen':'Kartenanimation pausieren');button.dataset.paused=String(paused);}
    function resize(){const r=host.getBoundingClientRect();width=r.width;height=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);render(preference.matches?10:time);}
    async function load(){
      if(loading||data)return;loading=true;
      try{
        const response=await fetch('assets/traffic-map/map-data.json');if(!response.ok)throw new Error('Map data unavailable');
        const loaded=await response.json();const images=await Promise.all(loaded.frames.map(f=>readImage(f.src)));
        loaded.frames.forEach((f,i)=>f.image=images[i]);data=loaded;paths=data.features.map(pathData).filter(p=>p.length>0);
        resize();host.classList.add('is-ready');sync();
      }catch(error){console.warn('Traffic illustration unavailable:',error);host.classList.add('is-unavailable');button.hidden=true;}
    }
    button.addEventListener('click',()=>{paused=!paused;sync();});
    preference.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
    new ResizeObserver(resize).observe(host);
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)load();sync();},{threshold:.05}).observe(host);
    resize();
  });
})();
